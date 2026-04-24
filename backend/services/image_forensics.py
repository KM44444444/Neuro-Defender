import io
import numpy as np
from PIL import Image

# ─── 1. PIXEL INTEGRITY ───────────────────────────────────────────────────────


def pixel_integrity_score(arr: np.ndarray) -> float:
    """Histogram spikiness, channel imbalance, saturation anomaly, kurtosis."""
    r = arr[:, :, 0].astype(np.float64)
    g = arr[:, :, 1].astype(np.float64)
    b = arr[:, :, 2].astype(np.float64)
    n = arr.shape[0] * arr.shape[1]

    mR, mG, mB = r.mean(), g.mean(), b.mean()
    imbalance = min(1.0, (abs(mR - mG) + abs(mG - mB) + abs(mR - mB)) / 150.0)

    hR, _ = np.histogram(r.flatten(), bins=256, range=(0, 255))
    hG, _ = np.histogram(g.flatten(), bins=256, range=(0, 255))
    neighbors_R = (np.roll(hR, 1) + np.roll(hR, -1)) / 2
    neighbors_G = (np.roll(hG, 1) + np.roll(hG, -1)) / 2
    spikiness = float(
        np.sum(
            np.abs(hR[1:-1] - neighbors_R[1:-1]) + np.abs(hG[1:-1] - neighbors_G[1:-1])
        )
        / (n * 2)
    )
    spikiness = min(1.0, spikiness * 12.0)

    mx = np.maximum(r, np.maximum(g, b))
    mn = np.minimum(r, np.minimum(g, b))
    sat = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0.0)
    sat_anomaly = min(1.0, max(0.0, (float(sat.mean()) - 0.55) * 2.5))

    gray = r * 0.299 + g * 0.587 + b * 0.114
    std_g = float(gray.std()) or 1.0
    kurt = float(np.mean(((gray - gray.mean()) / std_g) ** 4)) - 3.0
    kurt_score = min(1.0, abs(kurt) / 8.0)

    raw_score = min(
        1.0,
        0.30 * imbalance + 0.35 * spikiness + 0.20 * sat_anomaly + 0.15 * kurt_score,
    )

    gray_std = float(gray.std())
    if gray_std < 6.0:
        raw_score *= 0.35
    elif gray_std < 12.0:
        raw_score *= 0.60

    return round(min(1.0, raw_score), 4)


# ─── 2. LSB BIT-LEVEL ANALYSIS ────────────────────────────────────────────────


def lsb_analysis_score(arr: np.ndarray) -> float:
    flat_r = arr[:, :, 0].flatten().astype(np.int32)
    n = len(flat_r)
    if n < 2:
        return 0.0

    lsb_r = flat_r & 1
    lsb_cur = lsb_r[:-1]
    lsb_next = lsb_r[1:]
    p00 = int(np.sum((lsb_cur == 0) & (lsb_next == 0)))
    p01 = int(np.sum((lsb_cur == 0) & (lsb_next == 1)))
    p10 = int(np.sum((lsb_cur == 1) & (lsb_next == 0)))
    p11 = int(np.sum((lsb_cur == 1) & (lsb_next == 1)))
    total_pairs = p00 + p01 + p10 + p11
    if total_pairs == 0:
        return 0.0

    expected = total_pairs / 4.0
    chi_sq = (
        sum((obs - expected) ** 2 / expected for obs in [p00, p01, p10, p11]) / total_pairs
    )
    chi_score = 1.0 - min(1.0, chi_sq * 80.0)
    chi_score = max(0.0, chi_score)

    lsb_ratio = float(lsb_r.mean())
    ratio_closeness = max(0.0, 0.5 - abs(lsb_ratio - 0.5))
    ratio_score = min(1.0, ratio_closeness * 3.2)

    changes = np.where(np.diff(lsb_r) != 0)[0]
    if len(changes) == 0:
        run_lengths = np.array([n], dtype=np.int64)
    else:
        run_lengths = np.diff(np.concatenate([[0], changes + 1, [n]]))

    unique_runs, counts = np.unique(run_lengths, return_counts=True)
    probs = counts.astype(np.float64) / counts.sum()
    rle_entropy = float(-np.sum(probs * np.log2(probs + 1e-12)))
    max_entropy = float(np.log2(len(unique_runs) + 1))
    rle_score = min(1.0, rle_entropy / (max_entropy or 1.0))

    score = min(1.0, 0.55 * chi_score + 0.30 * rle_score + 0.15 * ratio_score)
    return round(score, 4)


# ─── 3. FREQUENCY DOMAIN (FFT2 + blocking) ──────────────────────────────────


def frequency_domain_score(arr_gray: np.ndarray) -> float:
    h, w = arr_gray.shape
    f = np.fft.fft2(arr_gray.astype(np.float64))
    fshift = np.fft.fftshift(f)
    magnitude = np.abs(fshift)

    total_energy = float((magnitude ** 2).sum()) or 1.0
    cy, cx = h // 2, w // 2

    radius_low = int(min(h, w) * 0.05)
    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((Y - cy) ** 2 + (X - cx) ** 2)
    low_freq_energy = float((magnitude[dist <= radius_low] ** 2).sum())

    ac_ratio = (total_energy - low_freq_energy) / total_energy
    ac_score = min(1.0, max(0.0, (ac_ratio - 0.40) / 0.30))

    block = 8
    boundary_diffs = []
    interior_diffs = []
    for y in range(1, h):
        row_diff = np.abs(arr_gray[y, :].astype(np.float64) - arr_gray[y - 1, :].astype(np.float64))
        if y % block == 0:
            boundary_diffs.append(float(row_diff.mean()))
        else:
            interior_diffs.append(float(row_diff.mean()))

    avg_boundary = float(np.mean(boundary_diffs)) if boundary_diffs else 0.0
    avg_interior = float(np.mean(interior_diffs)) if interior_diffs else 1.0
    blocking_ratio = avg_boundary / (avg_interior + 1e-9)
    blocking_score = min(1.0, max(0.0, (blocking_ratio - 1.0) / 1.5))

    return round(min(1.0, 0.60 * ac_score + 0.40 * blocking_score), 4)


# ─── 4. EDGE / TEXTURE ───────────────────────────────────────────────────────


def edge_texture_score(arr_gray: np.ndarray) -> float:
    from scipy.ndimage import uniform_filter, sobel as scipy_sobel

    try:
        gx = scipy_sobel(arr_gray.astype(np.float64), axis=1)
        gy = scipy_sobel(arr_gray.astype(np.float64), axis=0)
    except Exception:
        ag = arr_gray.astype(np.float64)
        diff_x = np.pad(np.diff(ag, axis=1), ((0, 0), (0, 1)))
        diff_y = np.pad(np.diff(ag, axis=0), ((0, 1), (0, 0)))
        gx, gy = diff_x, diff_y

    mag = np.sqrt(gx**2 + gy**2)
    total_edge = float(mag.sum()) or 1.0

    high = (mag > 100).astype(np.float64)
    try:
        neighborhood = uniform_filter(high, size=5)
        isolated = high * (neighborhood < 0.25)
    except Exception:
        isolated = high * 0.1
    edge_score = min(1.0, float((isolated * mag).sum()) / (total_edge * 0.15))

    h, w = arr_gray.shape
    patch = 16
    stds = []
    for py in range(0, h - patch, patch):
        for px in range(0, w - patch, patch):
            stds.append(float(arr_gray[py : py + patch, px : px + patch].std()))
    if stds:
        std_arr = np.array(stds, dtype=np.float64)
        texture_score = min(1.0, float(std_arr.var()) / 500.0)
    else:
        texture_score = 0.0

    return round(min(1.0, 0.50 * edge_score + 0.50 * texture_score), 4)


# ─── 5. NOISE FORENSICS ──────────────────────────────────────────────────────


def noise_forensics_score(arr: np.ndarray) -> float:
    from scipy.ndimage import uniform_filter

    gray = (
        arr[:, :, 0].astype(np.float64) * 0.299
        + arr[:, :, 1].astype(np.float64) * 0.587
        + arr[:, :, 2].astype(np.float64) * 0.114
    )
    blurred = uniform_filter(gray, size=3)
    residual = gray - blurred
    noise_std = float(residual.std())

    injected_score = min(1.0, max(0.0, (noise_std - 12.0) / 25.0))
    denoised_score = min(1.0, max(0.0, (1.2 - noise_std) / 1.2))

    h, w = gray.shape
    patch = 16
    patch_stds = []
    for py in range(0, h - patch, patch):
        for px in range(0, w - patch, patch):
            p = gray[py : py + patch, px : px + patch]
            pb = uniform_filter(p, size=3)
            patch_stds.append(float((p - pb).std()))

    if patch_stds:
        pn_arr = np.array(patch_stds, dtype=np.float64)
        pn_mean = pn_arr.mean()
        pn_cov = float(pn_arr.std()) / (pn_mean + 1e-9)
        inconsistency = min(1.0, pn_cov * 1.5)
    else:
        inconsistency = 0.0

    return round(
        min(1.0, 0.35 * injected_score + 0.25 * denoised_score + 0.40 * inconsistency),
        4,
    )


# ─── 6. JPEG QUALITY SQUEEZE (deterministic) ────────────────────────────────

JPEG_SQUEEZE_QUALITY = 85


def feature_squeeze_score(pil_rgb: Image.Image) -> float:
    """
    Fixed JPEG encode/decode at quality=85; mean abs diff vs original.
    Same Pillow build + same image → same score.
    """
    buf = io.BytesIO()
    pil_rgb.save(
        buf,
        format="JPEG",
        quality=JPEG_SQUEEZE_QUALITY,
        subsampling=2,
        optimize=False,
    )
    buf.seek(0)
    decoded = Image.open(buf).convert("RGB")
    if decoded.size != pil_rgb.size:
        decoded = decoded.resize(pil_rgb.size, Image.Resampling.BOX)

    a = np.asarray(pil_rgb, dtype=np.uint8).astype(np.float64)
    b = np.asarray(decoded, dtype=np.uint8).astype(np.float64)
    mad = float(np.mean(np.abs(a - b)))
    score = min(1.0, mad / 18.0)
    return round(score, 4)


# ─── 7. RECONSTRUCTION PROXY (Laplacian only, deterministic) ───────────────


def reconstruction_score(arr: np.ndarray) -> float:
    gray = (
        arr[:, :, 0].astype(np.float64) * 0.299
        + arr[:, :, 1].astype(np.float64) * 0.587
        + arr[:, :, 2].astype(np.float64) * 0.114
    )
    p = np.pad(gray, 1, mode="reflect")
    lap = -4 * gray + p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
    lap_variance = float(lap.var())
    lap_score = min(1.0, max(0.0, (lap_variance - 180.0) / 2800.0))
    return round(lap_score, 4)


# ─── 8. METADATA ────────────────────────────────────────────────────────────


def metadata_score(pil_img: Image.Image, raw: bytes) -> float:
    score = 0.0

    try:
        exif_data = pil_img._getexif() if hasattr(pil_img, "_getexif") else None
    except Exception:
        exif_data = None

    if exif_data:
        software = str(exif_data.get(305, "")).lower()
        suspicious_sw = [
            "photoshop",
            "gimp",
            "lightroom",
            "affinity",
            "capture one",
            "snapseed",
            "vsco",
            "facetune",
            "meitu",
            "retouch",
        ]
        if any(s in software for s in suspicious_sw):
            score += 0.30
        if exif_data.get(274) is None:
            score += 0.10

    w, h = pil_img.size
    if w % 64 == 0 and h % 64 == 0 and min(w, h) >= 1024:
        score += 0.05
    ratio = w / max(h, 1)
    common_ratios = [1.0, 4 / 3, 3 / 2, 16 / 9, 2.0, 3 / 4, 9 / 16]
    if any(abs(ratio - r) < 0.001 for r in common_ratios) and max(w, h) > 2000:
        score += 0.05

    return round(min(1.0, score), 4)

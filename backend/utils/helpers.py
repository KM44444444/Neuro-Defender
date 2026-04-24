def classify_threat(score: float) -> str:
    """Enterprise bands: SAFE 0–0.30, LOW 0.31–0.50, MEDIUM 0.51–0.75, HIGH 0.76–1.00"""
    if score <= 0.30:
        return "SAFE"
    if score <= 0.50:
        return "LOW"
    if score <= 0.75:
        return "MEDIUM"
    return "HIGH"

# ─── Image Summary ────────────────────────────────────────────────────────────

def generate_image_summary_v3(scores: dict, threat: str) -> str:
    if threat == "SAFE":
        return "Image passes all forensic checks. No manipulation detected."
    if threat == "LOW":
        return "Minor anomalies detected. Likely processed (resized/compressed) but not maliciously altered."
    labels = {
        "pixel": "pixel histogram/channel anomaly",
        "lsb": "bit-level LSB payload or steganography",
        "frequency": "frequency-domain artifact (DCT/compression forensics)",
        "edge": "edge/texture inconsistency (clone-stamp or splice)",
        "noise": "anomalous noise pattern (injected or inconsistent)",
        "squeeze": "JPEG quality-squeeze residual",
        "reconstruction": "reconstruction divergence (adversarial perturbation)",
        "reconstruct": "high Laplacian energy (high-frequency anomaly)",
        "metadata": "metadata/EXIF anomaly",
    }
    top = sorted(
        [(k, v) for k, v in scores.items() if k != "combined"],
        key=lambda x: x[1], reverse=True
    )[:2]
    findings = " + ".join(labels.get(k, k) for k, _ in top)
    return (
        f"High-confidence forensic threat: {findings}."
        if threat == "HIGH"
        else f"Suspicious forensic signals: {findings}."
    )


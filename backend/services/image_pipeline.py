"""Locked decode + resize pipeline: same bytes → same RGB array every time."""

from __future__ import annotations

import io
from typing import Tuple

import numpy as np
from PIL import Image, UnidentifiedImageError


LONGEST_SIDE = 512


def decode_bytes_to_rgb_pil(raw: bytes) -> Image.Image:
    """Decode uploaded bytes once; always return RGB (no alpha)."""
    try:
        pil = Image.open(io.BytesIO(raw))
        pil.load()
    except (UnidentifiedImageError, OSError) as e:
        raise ValueError("Invalid or corrupted image file.") from e

    if pil.mode in ("RGBA", "LA") or (pil.mode == "P" and "transparency" in pil.info):
        bg = Image.new("RGB", pil.size, (255, 255, 255))
        bg.paste(pil.convert("RGBA"))
        return bg
    return pil.convert("RGB")


def resize_longest_side_area(pil_rgb: Image.Image, longest: int = LONGEST_SIDE) -> Image.Image:
    """
    If max(w,h) > longest, downscale so longest side == longest.
    No upscale. Pillow BOX resampling approximates INTER_AREA for shrink.
    """
    w, h = pil_rgb.size
    m = max(w, h)
    if m <= longest:
        return pil_rgb
    scale = longest / float(m)
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    return pil_rgb.resize((nw, nh), Image.Resampling.BOX)


def rgb_pil_to_arrays(pil_rgb: Image.Image) -> Tuple[np.ndarray, np.ndarray]:
    """uint8 HxWx3 and float64 grayscale."""
    arr = np.asarray(pil_rgb, dtype=np.uint8)
    r = arr[:, :, 0].astype(np.float64)
    g = arr[:, :, 1].astype(np.float64)
    b = arr[:, :, 2].astype(np.float64)
    gray = r * 0.299 + g * 0.587 + b * 0.114
    return arr, gray

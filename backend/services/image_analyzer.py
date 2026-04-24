"""Deterministic image forensic analysis: same bytes → same scores."""

from __future__ import annotations

import hashlib
from typing import Any

import numpy as np

from services import image_forensics as forensic
from services.image_pipeline import (
    decode_bytes_to_rgb_pil,
    resize_longest_side_area,
    rgb_pil_to_arrays,
)
from utils.helpers import classify_threat, generate_image_summary_v3


def _clip01(x: float) -> float:
    if x <= 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return x


def compute_image_result(raw: bytes, filename: str = "") -> dict[str, Any]:
    """
    Pure deterministic pipeline from raw file bytes.
    No cache, no wall-clock fields.
    """
    sha = hashlib.sha256(raw).hexdigest()

    pil_orig = decode_bytes_to_rgb_pil(raw)
    pil_work = resize_longest_side_area(pil_orig)
    arr, arr_gray = rgb_pil_to_arrays(pil_work)

    pixel = _clip01(float(forensic.pixel_integrity_score(arr)))
    noise = _clip01(float(forensic.noise_forensics_score(arr)))
    frequency = _clip01(float(forensic.frequency_domain_score(arr_gray)))
    edge = _clip01(float(forensic.edge_texture_score(arr_gray)))
    lsb = _clip01(float(forensic.lsb_analysis_score(arr)))
    squeeze = _clip01(float(forensic.feature_squeeze_score(pil_work)))
    reconstruct = _clip01(float(forensic.reconstruction_score(arr)))
    metadata = _clip01(float(forensic.metadata_score(pil_orig, raw)))

    combined = round(
        _clip01(
            0.16 * pixel
            + 0.14 * noise
            + 0.15 * frequency
            + 0.14 * edge
            + 0.18 * lsb
            + 0.11 * squeeze
            + 0.08 * reconstruct
            + 0.04 * metadata
        ),
        4,
    )

    threat = classify_threat(combined)
    scores = {
        "pixel": pixel,
        "noise": noise,
        "frequency": frequency,
        "edge": edge,
        "lsb": lsb,
        "squeeze": squeeze,
        "reconstruct": reconstruct,
        "reconstruction": reconstruct,
        "metadata": metadata,
        "combined": combined,
    }
    summary = generate_image_summary_v3(scores, threat)

    return {
        "sha256": sha,
        "deterministic": True,
        "type": "image",
        "score": combined,
        "confidence": combined,
        "threat_level": threat,
        "summary": summary,
        "scores": scores,
        "stats": {
            "mean": round(float(np.mean(arr_gray)), 2),
            "std": round(float(np.std(arr_gray)), 2),
        },
        "is_adversarial": combined > 0.30,
        "is_threat": combined >= 0.51,
    }

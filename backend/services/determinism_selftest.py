"""Mandatory repeatability check: 5 identical analyses on the same bytes."""

from __future__ import annotations

import io
import json

from PIL import Image

from services.image_analyzer import compute_image_result

_TOLERANCE = 1e-4


def _canonical(d: dict) -> str:
    return json.dumps(d, sort_keys=True, separators=(",", ":"))


def run_five_run_identity_test() -> None:
    im = Image.new("RGB", (64, 64), (120, 130, 140))
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    raw = buf.getvalue()

    outs = [compute_image_result(raw, "selftest.png") for _ in range(5)]
    base = _canonical(outs[0])
    for i, o in enumerate(outs[1:], start=2):
        if _canonical(o) != base:
            raise RuntimeError(
                f"Determinism self-test failed: run 1 vs run {i} differ. "
                "Image forensics must be bitwise-repeatable."
            )

    # Float sanity: combined stable to 4 decimals
    s0 = outs[0]["score"]
    if any(abs(o["score"] - s0) > _TOLERANCE for o in outs):
        raise RuntimeError("Determinism self-test failed: score drift exceeds tolerance.")

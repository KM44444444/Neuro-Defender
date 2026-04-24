import hashlib
import time
from fastapi import APIRouter, File, UploadFile, HTTPException
from models.schemas import TextInput
from utils.logger import logger
from utils.settings import (
    MAX_UPLOAD_BYTES,
    TEXT_ADVERSARIAL_THRESHOLD,
    IMAGE_CACHE_PATH,
)
from utils import image_result_cache as img_cache
from services.image_analyzer import compute_image_result
from services.text_forensics import (
    _model_confidence,
    _perturbation_score,
    _anomaly_ratio,
    _invisible_char_score,
    _homoglyph_score,
    _unicode_mixing_score,
    _encoded_payload_score,
    _url_score,
    _generate_text_summary,
)

router = APIRouter()
IMAGE_ANALYSIS_VERSION = "image-v6.0-deterministic"


@router.post("/api/v1/detect")
async def detect(image: UploadFile = File(...)):
    t0 = time.perf_counter()

    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(400, "Uploaded file is not an image.")

    raw = await image.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image too large (max 20 MB).")
    if len(raw) == 0:
        raise HTTPException(400, "Empty file uploaded.")

    try:
        file_hash = hashlib.sha256(raw).hexdigest()
        cached = img_cache.cache_get(file_hash)
        cache_hit = cached is not None

        if cache_hit:
            payload = cached
        else:
            try:
                payload = compute_image_result(raw, image.filename or "")
            except ValueError as e:
                raise HTTPException(400, str(e)) from e
            img_cache.cache_set(file_hash, payload, IMAGE_CACHE_PATH)

        elapsed = round((time.perf_counter() - t0) * 1000, 1)
        logger.info(
            f"[IMAGE] file={image.filename} sha256={file_hash} "
            f"combined={payload['score']} threat={payload['threat_level']} "
            f"cache_hit={cache_hit} time={elapsed}ms"
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception(f"[IMAGE] failed file={image.filename}")
        raise HTTPException(500, "Image analysis failed.")

    return {
        **payload,
        "cache_hit": cache_hit,
        "meta": {
            "filename": image.filename,
            "size_kb": round(len(raw) / 1024, 1),
            "response_ms": elapsed,
            "analysis_version": IMAGE_ANALYSIS_VERSION,
        },
    }


@router.post("/api/v1/text-detect")
async def text_detect(payload: TextInput):
    t0 = time.perf_counter()
    text = payload.text.strip()

    if not text:
        return {
            "type": "text",
            "is_adversarial": False,
            "is_threat": False,
            "threat_level": "LOW",
            "score": 0.0,
            "confidence": 0.0,
            "summary": "Empty input.",
            "scores": {
                k: 0.0
                for k in [
                    "confidence",
                    "perturbation",
                    "anomaly",
                    "invisible",
                    "homoglyph",
                    "unicodeMix",
                    "encoded",
                    "url",
                    "combined",
                ]
            },
        }

    conf = round(min(1.0, max(0.0, 1.0 - _model_confidence(text))), 4)
    perturbation = round(_perturbation_score(text), 4)
    anomaly = round(_anomaly_ratio(text), 4)
    invisible = round(_invisible_char_score(text), 4)
    homoglyph = round(_homoglyph_score(text), 4)
    unicode_mix = round(_unicode_mixing_score(text), 4)
    encoded = round(_encoded_payload_score(text), 4)
    url = round(_url_score(text), 4)

    combined = round(
        min(
            1.0,
            0.12 * conf
            + 0.08 * perturbation
            + 0.20 * anomaly
            + 0.20 * invisible
            + 0.15 * homoglyph
            + 0.10 * unicode_mix
            + 0.10 * encoded
            + 0.05 * url,
        ),
        4,
    )

    threat = "HIGH" if combined > 0.55 else "MEDIUM" if combined > 0.30 else "LOW"
    scores = {
        "confidence": conf,
        "perturbation": perturbation,
        "anomaly": anomaly,
        "invisible": invisible,
        "homoglyph": homoglyph,
        "unicodeMix": unicode_mix,
        "encoded": encoded,
        "url": url,
        "combined": combined,
    }

    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    logger.info(f"[TEXT] combined={combined} threat={threat} time={elapsed}ms")

    return {
        "type": "text",
        "is_adversarial": combined >= TEXT_ADVERSARIAL_THRESHOLD,
        "is_threat": combined >= TEXT_ADVERSARIAL_THRESHOLD,
        "threat_level": threat,
        "score": combined,
        "confidence": combined,
        "summary": _generate_text_summary(scores, threat),
        "scores": scores,
        "meta": {"length": len(text), "response_ms": elapsed},
    }


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "version": "6.0.0-deterministic",
        "modules": {
            "pixel_integrity": "deterministic — histogram / channel / kurtosis",
            "lsb_analysis": "deterministic — pair chi-square + run-length entropy",
            "frequency_domain": "deterministic — FFT2 AC ratio + JPEG block boundary",
            "edge_texture": "deterministic — Sobel isolation + patch texture variance",
            "noise_forensics": "deterministic — high-pass residual + patch CoV",
            "feature_squeezing": "deterministic — fixed JPEG Q=85 round-trip residual",
            "reconstruction": "deterministic — Laplacian variance proxy",
            "metadata": "deterministic — EXIF + dimension heuristics (original decode)",
        },
    }


@router.get("/")
async def root():
    return {
        "message": "NeuroDefender API v6 — deterministic /api/v1/detect — /api/v1/text-detect — /health"
    }

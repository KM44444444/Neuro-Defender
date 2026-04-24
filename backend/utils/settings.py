import os

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except Exception:
        return default


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except Exception:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


# API / security
MAX_UPLOAD_BYTES = _env_int("ND_MAX_UPLOAD_BYTES", 20 * 1024 * 1024)
RATE_LIMIT_RPS = _env_float("ND_RATE_LIMIT_RPS", 5.0)  # per IP, per route bucket
RATE_LIMIT_BURST = _env_int("ND_RATE_LIMIT_BURST", 10)

# CORS
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ND_ALLOWED_ORIGINS", "*").split(",") if o.strip()
]

# Thresholds (tune without code changes)
IMAGE_ADVERSARIAL_THRESHOLD = _env_float("ND_IMAGE_ADVERSARIAL_THRESHOLD", 0.20)
IMAGE_THREAT_THRESHOLD = _env_float("ND_IMAGE_THREAT_THRESHOLD", 0.45)
TEXT_ADVERSARIAL_THRESHOLD = _env_float("ND_TEXT_ADVERSARIAL_THRESHOLD", 0.30)

# Scoring switches
USE_UNTRAINED_AUTOENCODER = _env_bool("ND_USE_UNTRAINED_AUTOENCODER", False)

# Deterministic image cache (sha256 → JSON). Set ND_IMAGE_CACHE_PATH="" to disable disk.
_raw_cache = os.getenv("ND_IMAGE_CACHE_PATH")
if _raw_cache is None:
    IMAGE_CACHE_PATH = os.path.join(_BACKEND_ROOT, ".cache", "nd_image_cache.json")
elif _raw_cache.strip() == "":
    IMAGE_CACHE_PATH = None
else:
    IMAGE_CACHE_PATH = _raw_cache

SKIP_IMAGE_SELFTEST = _env_bool("ND_SKIP_IMAGE_SELFTEST", False)

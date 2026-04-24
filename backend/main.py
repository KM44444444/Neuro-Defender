import time
from contextlib import asynccontextmanager
from collections import defaultdict, deque
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.status import HTTP_429_TOO_MANY_REQUESTS
from routes.api import router
from utils.settings import (
    ALLOWED_ORIGINS,
    RATE_LIMIT_RPS,
    RATE_LIMIT_BURST,
    IMAGE_CACHE_PATH,
    SKIP_IMAGE_SELFTEST,
)
from utils.determinism import bootstrap_determinism
from utils.image_result_cache import load_disk_cache
from services.determinism_selftest import run_five_run_identity_test


@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap_determinism()
    load_disk_cache(IMAGE_CACHE_PATH)
    if not SKIP_IMAGE_SELFTEST:
        run_five_run_identity_test()
    yield


app = FastAPI(title="NeuroDefender API", version="6.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_rl_buckets: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def _rate_limited(ip: str, route_key: str, now_s: float) -> bool:
    """
    Token-bucket-ish limiter implemented as a sliding window:
    allow up to RATE_LIMIT_BURST events in the last window where
    window = burst / rps seconds.
    """
    rps = max(0.1, float(RATE_LIMIT_RPS))
    burst = max(1, int(RATE_LIMIT_BURST))
    window = burst / rps

    q = _rl_buckets[(ip, route_key)]
    cutoff = now_s - window
    while q and q[0] < cutoff:
        q.popleft()
    if len(q) >= burst:
        return True
    q.append(now_s)
    return False


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    now = time.time()
    ip = (request.client.host if request.client else "unknown")[:128]
    route_key = request.url.path
    if _rate_limited(ip, route_key, now):
        return JSONResponse(
            status_code=HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "type": "rate_limit",
                    "message": "Too many requests. Slow down and retry.",
                }
            },
        )

    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as e:
        # Avoid leaking internals; still return a consistent JSON error.
        return JSONResponse(
            status_code=500,
            content={"error": {"type": "internal", "message": "Internal server error."}},
        )
    elapsed = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Response-Time-Ms"] = str(elapsed)
    return response

app.include_router(router)

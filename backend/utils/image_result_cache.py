"""In-memory + optional JSON cache: sha256(raw) → frozen analysis payload."""

from __future__ import annotations

import json
import os
import threading
from typing import Any, Optional

_lock = threading.Lock()
_memory: dict[str, dict[str, Any]] = {}


def _atomic_write(path: str, data: str) -> None:
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(data)
    os.replace(tmp, path)


def load_disk_cache(path: Optional[str]) -> None:
    if not path or not os.path.isfile(path):
        return
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            with _lock:
                for k, v in data.items():
                    if isinstance(k, str) and isinstance(v, dict):
                        _memory[k] = v
    except Exception:
        pass


def persist_disk_cache(path: Optional[str]) -> None:
    if not path:
        return
    with _lock:
        snapshot = dict(_memory)
    try:
        _atomic_write(path, json.dumps(snapshot, sort_keys=True, separators=(",", ":")))
    except Exception:
        pass


def cache_get(sha256_hex: str) -> Optional[dict[str, Any]]:
    with _lock:
        v = _memory.get(sha256_hex)
        return json.loads(json.dumps(v)) if v is not None else None


def cache_set(sha256_hex: str, payload: dict[str, Any], disk_path: Optional[str]) -> None:
    frozen = json.loads(json.dumps(payload, sort_keys=True, separators=(",", ":")))
    with _lock:
        _memory[sha256_hex] = frozen
    persist_disk_cache(disk_path)


def cache_has(sha256_hex: str) -> bool:
    with _lock:
        return sha256_hex in _memory

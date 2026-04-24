"""Global deterministic seeds for repeatable inference and scoring."""

from __future__ import annotations

import os
import random

_SEED = 42


def bootstrap_determinism(seed: int = _SEED) -> None:
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")

    random.seed(seed)

    import numpy as np

    np.random.seed(seed)

    try:
        import torch

        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
        # Strict mode can break unrelated ops; image v6+ avoids torch entirely.
        try:
            torch.use_deterministic_algorithms(True, warn_only=True)
        except TypeError:
            torch.use_deterministic_algorithms(True)
    except Exception:
        pass

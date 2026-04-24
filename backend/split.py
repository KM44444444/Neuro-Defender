import os

with open('main.py', 'r') as f:
    lines = f.readlines()

def get_section(start_str, end_str=None):
    start_idx = next(i for i, l in enumerate(lines) if start_str in l)
    if end_str:
        end_idx = next(i for i, l in enumerate(lines[start_idx+1:]) if end_str in l) + start_idx + 1
        return lines[start_idx:end_idx]
    return lines[start_idx:]

with open('utils/logger.py', 'w') as f:
    f.writelines([
        "import logging\n\n",
        "logging.basicConfig(\n",
        "    level=logging.INFO,\n",
        "    format=\"%(asctime)s [%(levelname)s] %(name)s — %(message)s\",\n",
        ")\n",
        "logger = logging.getLogger(\"neurodefender\")\n"
    ])

with open('models/schemas.py', 'w') as f:
    f.writelines([
        "from pydantic import BaseModel\n\n",
        "class TextInput(BaseModel):\n",
        "    text: str\n"
    ])

with open('models/networks.py', 'w') as f:
    f.writelines([
        "import torch\n",
        "import torch.nn as nn\n",
        "import torchvision.transforms as T\n",
        "import torchvision.models as models\n",
        "from utils.logger import logger\n\n"
    ])
    f.writelines(get_section('# ─── Transforms', '# ─── 1. PIXEL INTEGRITY'))

with open('services/image_forensics.py', 'w') as f:
    f.writelines([
        "import numpy as np\n",
        "import torch\n",
        "from PIL import Image\n",
        "from models.networks import classifier, autoencoder, TRANSFORM\n\n"
    ])
    f.writelines(get_section('# ─── 1. PIXEL INTEGRITY', '# ─── Threat Classification'))

with open('services/text_forensics.py', 'w') as f:
    f.writelines([
        "import re\n",
        "import math\n\n"
    ])
    f.writelines(get_section('# ─── Text Analysis Helpers', '# ─── Text Endpoint'))

with open('utils/helpers.py', 'w') as f:
    f.writelines([
        "def classify_threat(score: float) -> str:\n",
        "    if score > 0.65: return \"HIGH\"\n",
        "    if score > 0.40: return \"MEDIUM\"\n",
        "    if score > 0.20: return \"LOW\"\n",
        "    return \"SAFE\"\n\n"
    ])
    f.writelines(get_section('# ─── Image Summary', '# ─── Image Endpoint'))

with open('routes/api.py', 'w') as f:
    f.writelines([
        "import io\n",
        "import time\n",
        "import numpy as np\n",
        "from fastapi import APIRouter, File, UploadFile, HTTPException\n",
        "from PIL import Image, UnidentifiedImageError\n",
        "from models.schemas import TextInput\n",
        "from models.networks import TRANSFORM\n",
        "from utils.logger import logger\n",
        "from utils.helpers import classify_threat, generate_image_summary_v3\n",
        "from services.image_forensics import (\n",
        "    pixel_integrity_score, lsb_analysis_score, frequency_domain_score,\n",
        "    edge_texture_score, noise_forensics_score, feature_squeeze_score,\n",
        "    reconstruction_score, metadata_score\n",
        ")\n",
        "from services.text_forensics import (\n",
        "    _model_confidence, _perturbation_score, _anomaly_ratio, _invisible_char_score,\n",
        "    _homoglyph_score, _unicode_mixing_score, _encoded_payload_score, _url_score,\n",
        "    _generate_text_summary\n",
        ")\n\n",
        "router = APIRouter()\n",
        "MAX_UPLOAD_BYTES = 20 * 1024 * 1024\n\n"
    ])
    
    # We will grab the endpoints from the original file, but we need to replace @app with @router.
    ep_img = get_section('# ─── Image Endpoint', '# ─── Text Analysis Helpers')
    ep_img = [line.replace('@app', '@router') for line in ep_img]
    f.writelines(ep_img)
    
    ep_txt = get_section('# ─── Text Endpoint', '# ─── Health Check')
    ep_txt = [line for line in ep_txt if "class TextInput" not in line and "text: str" not in line]
    ep_txt = [line.replace('@app', '@router') for line in ep_txt]
    f.writelines(ep_txt)

    ep_health = get_section('# ─── Health Check')
    ep_health = [line.replace('@app', '@router') for line in ep_health]
    f.writelines(ep_health)

# Now creating the new main.py
with open('main_new.py', 'w') as f:
    f.writelines([
        "import time\n",
        "from fastapi import FastAPI, Request\n",
        "from fastapi.middleware.cors import CORSMiddleware\n",
        "from routes.api import router\n\n",
        "app = FastAPI(title=\"NeuroDefender API\", version=\"2.0.0\")\n\n",
        "app.add_middleware(\n",
        "    CORSMiddleware,\n",
        "    allow_origins=[\"*\"],\n",
        "    allow_methods=[\"*\"],\n",
        "    allow_headers=[\"*\"],\n",
        ")\n\n",
        "@app.middleware(\"http\")\n",
        "async def timing_middleware(request: Request, call_next):\n",
        "    start = time.perf_counter()\n",
        "    response = await call_next(request)\n",
        "    elapsed = round((time.perf_counter() - start) * 1000, 1)\n",
        "    response.headers[\"X-Response-Time-Ms\"] = str(elapsed)\n",
        "    return response\n\n",
        "app.include_router(router)\n"
    ])

print("Finished splitting")

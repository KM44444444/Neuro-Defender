import sys
sys.path.append("backend")
import numpy as np
from PIL import Image
import io
import time
from services.image_analyzer import compute_image_result
from services.image_pipeline import decode_bytes_to_rgb_pil

# 1. Family photo (SAFE) -> random natural looking noise? No, let's just make a blank image with some gradient
img1 = Image.linear_gradient("L").convert("RGB").resize((512, 512))
b1 = io.BytesIO()
img1.save(b1, format="JPEG", quality=95)
b1 = b1.getvalue()

# 2. Instagram filtered (LOW) -> maybe resize + recompress
img2 = img1.resize((256, 256)).filter(Image.Filter.SMOOTH)
b2 = io.BytesIO()
img2.save(b2, format="JPEG", quality=75)
b2 = b2.getvalue()

# 3. WhatsApp forwarded (LOW/MEDIUM) -> low quality JPEG multiple times
img3 = Image.open(io.BytesIO(b2))
b3 = io.BytesIO()
img3.save(b3, format="JPEG", quality=30)
b3 = b3.getvalue()

# 4. Heavy noise / attacked (HIGH) -> lot of uniform noise
arr = np.random.randint(0, 255, (256, 256, 3), dtype=np.uint8)
img4 = Image.fromarray(arr)
b4 = io.BytesIO()
img4.save(b4, format="PNG")
b4 = b4.getvalue()

for i, raw in enumerate([b1, b2, b3, b4]):
    res = compute_image_result(raw)
    print(f"Test {i+1} Threat: {res['threat_level']}, Score: {res['score']}")
    print(res["scores"])
    print("---")


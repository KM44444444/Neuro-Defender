import sys
sys.path.append("backend")
from PIL import Image
import io
import time
from services.image_forensics import *

with open("test_img.png", "rb") as f:
    raw = f.read()

arr = np.array(Image.open(io.BytesIO(raw)).convert('RGB'))
print("pixel:", float(pixel_integrity_score(arr)))

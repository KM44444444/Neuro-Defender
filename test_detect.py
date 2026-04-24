import asyncio
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

with open("test_img.png", "rb") as f:
    response = client.post("/api/v1/detect", files={"image": ("test_img.png", f, "image/png")})

print(response.status_code)
print(response.text)

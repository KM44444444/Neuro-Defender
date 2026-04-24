# NeuroDefender

Enterprise-grade adversarial attack detection system.

## Project Structure

This project has been separated into two clean, self-contained directories:
- `frontend/` (React + Vite)
- `backend/` (FastAPI + Python)

## Getting Started

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt

# Run the backend on localhost:8000
uvicorn main:app --reload
```

### 2. Frontend (React/Vite)

```bash
cd frontend
npm install

# Run the frontend on localhost:5173
npm run dev
```

The frontend will automatically proxy `/api` requests to the local backend.
# Neuro-Defender

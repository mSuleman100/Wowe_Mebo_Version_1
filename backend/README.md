# WOWE Backend (FastAPI)

This backend implements the **UI contract** used by the Tactical C2 frontend.

## Run

From repo root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints (UI contract)

- **GET** `/health`
- **GET** `/video/{feed_id}` (returns a JPEG frame; currently a generated placeholder image)
- **POST** `/cmd/{cmd}`
- **POST** `/sequence` (JSON `{ "steps": [...] }`)


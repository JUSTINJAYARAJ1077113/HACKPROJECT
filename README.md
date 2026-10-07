# HACKPROJECT — DocuMind AI MVP

A small React + FastAPI MVP for asking grounded questions about text-based PDFs. Answers are generated only after retrieval from the uploaded document and returned with document name, page number, section, and the exact extracted passage. If the model cannot support an answer from the retrieved text, the API returns an explicit not-found response.

## MVP scope

- Upload a PDF (up to 25 MB) and extract text while preserving page numbers.
- Split page text into overlapping chunks and rank relevant chunks before answering.
- Show the answer separately from its source passages.
- Keep uploaded documents in backend memory for the lifetime of the process; restarting the API clears them.
- Use an OpenAI-compatible Chat Completions API. Secrets are read only from backend environment variables.

This first version does not OCR scanned/image-only PDFs, and table/chart understanding depends on the PDF text layer. It is a hackathon demo, not a production service: it has no login, persistent storage, or per-user isolation.

## Run locally

Use Python 3.10+ and Node.js 18+.

1. Configure backend environment values from .env.example and set OPENAI_API_KEY. Never commit a real key.
2. Start the API from the repository root:

       python -m venv .venv
       source .venv/bin/activate
       pip install -r backend/requirements.txt
       uvicorn backend.main:app --reload --port 8000

   On Windows, activate with .venv\Scripts\activate.
3. In a second terminal, start the frontend:

       cd frontend
       npm install
       npm run dev

4. Open the Vite URL printed in the terminal (normally http://localhost:5173). The API runs at http://localhost:8000; interactive API docs are at http://localhost:8000/docs.

For a compatible provider or proxy, set OPENAI_BASE_URL to its API root and OPENAI_MODEL to a model that supports Chat Completions. Set FRONTEND_ORIGIN to the frontend origin when it differs from the local default.

## API

- POST /upload — multipart form field file; returns document_id, filename, page_count, and chunk_count.
- POST /ask — JSON body with document_id and question; returns answer and evidence entries with document, page, section, and content.
- GET /health — basic service status.

## Tests

Install backend/requirements.txt, then run pytest from the repository root. Tests cover chunking, page metadata, and retrieval abstention; they do not call the external model API.

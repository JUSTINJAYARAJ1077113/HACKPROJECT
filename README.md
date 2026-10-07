# HACKPROJECT

Full-stack PDF question-answering (RAG) app. Upload PDFs, ask questions, and get answers grounded in exact, cited evidence.

- **Backend:** Python FastAPI (port 8000), `pypdf` text extraction, OpenAI `gpt-4o-mini` with JSON structured output
- **Frontend:** React + Vite + Tailwind CSS (port 5173)

## Project structure

```
backend/
  main.py            FastAPI app (/upload, /query, /health, /documents)
  requirements.txt
  .env.example
frontend/
  index.html
  vite.config.js
  src/
    App.jsx
    api.js
    main.jsx
    index.css
    components/
      Header.jsx
      UploadCard.jsx
      QueryCard.jsx
      ResponsePanel.jsx
      EvidenceCard.jsx
```

## Environment

Create `backend/.env`:

```
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

Optional `frontend/.env` (defaults to `http://localhost:8000`):

```
VITE_API_URL=http://localhost:8000
```

## Run

**Terminal 1 - backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then add your real OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

**Terminal 2 - frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## API

| Method | Path         | Body                          | Description                                  |
| ------ | ------------ | ----------------------------- | -------------------------------------------- |
| POST   | `/upload`    | multipart `file` (.pdf)       | Extracts text per page, chunks, stores in memory |
| POST   | `/query`     | `{"question": "..."}`         | Returns `{ answer, evidence[] }`             |
| GET    | `/health`    | -                             | Indexed documents and chunk count            |
| DELETE | `/documents` | -                             | Clears the in-memory index                   |

`/query` response:

```json
{
  "answer": "direct factual answer or NOT_FOUND",
  "evidence": [
    { "document_name": "file.pdf", "page": 3, "section": "Header", "content": "exact snippet" }
  ]
}
```

## Notes

- The index is in-memory and resets when the backend restarts.
- When total document text exceeds ~60k characters, the most keyword-relevant chunks are sent to the model.
- Scanned PDFs without a text layer cannot be indexed (no OCR).

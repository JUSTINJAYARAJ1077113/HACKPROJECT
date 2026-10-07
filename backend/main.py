import io
import json
import os
import re
import threading
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, Field
from pypdf import PdfReader
from pypdf.errors import PdfReadError

load_dotenv()

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
CHUNK_SIZE = 1500
MAX_CONTEXT_CHARS = 60000
NOT_FOUND = "NOT_FOUND"

app = FastAPI(title="HACKPROJECT PDF QA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Chunk(BaseModel):
    document_name: str
    page: int
    section: str
    content: str


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class Evidence(BaseModel):
    document_name: str
    page: int
    section: str
    content: str


class QueryResponse(BaseModel):
    answer: str
    evidence: List[Evidence]


class UploadResponse(BaseModel):
    status: str
    document_name: str
    pages_processed: int
    chunks_created: int


chunk_store: List[Chunk] = []
store_lock = threading.Lock()
_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured. Add it to backend/.env and restart the server.",
        )
    if _client is None:
        _client = OpenAI()
    return _client


def normalize_whitespace(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def detect_section(page_text: str, page_number: int) -> str:
    for line in page_text.splitlines():
        line = line.strip()
        if 3 <= len(line) <= 120 and re.search(r"[A-Za-z]", line):
            return line
    return f"Page {page_number}"


def split_into_chunks(text: str, size: int = CHUNK_SIZE) -> List[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: List[str] = []
    current = ""
    for paragraph in paragraphs:
        while len(paragraph) > size:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(paragraph[:size])
            paragraph = paragraph[size:]
        if len(current) + len(paragraph) + 2 > size and current:
            chunks.append(current)
            current = paragraph
        else:
            current = f"{current}\n\n{paragraph}" if current else paragraph
    if current:
        chunks.append(current)
    return chunks


def tokenize(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2}


def select_context(question: str, chunks: List[Chunk]) -> List[Chunk]:
    total = sum(len(c.content) for c in chunks)
    if total <= MAX_CONTEXT_CHARS:
        return chunks

    question_terms = tokenize(question)
    scored = sorted(
        enumerate(chunks),
        key=lambda item: len(question_terms & tokenize(item[1].content)),
        reverse=True,
    )
    selected_indexes: List[int] = []
    used = 0
    for index, chunk in scored:
        if used + len(chunk.content) > MAX_CONTEXT_CHARS:
            continue
        selected_indexes.append(index)
        used += len(chunk.content)
    return [chunks[i] for i in sorted(selected_indexes)]


def build_context(chunks: List[Chunk]) -> str:
    blocks = []
    for chunk in chunks:
        blocks.append(
            f"[document_name: {chunk.document_name} | page: {chunk.page} | section: {chunk.section}]\n"
            f"{chunk.content}"
        )
    return "\n\n---\n\n".join(blocks)


SYSTEM_PROMPT = f"""You are a precise document question-answering assistant.
Answer ONLY using the provided PDF context. Never use outside knowledge.

Respond with a single JSON object with exactly this structure:
{{
  "answer": "<direct factual answer string or '{NOT_FOUND}'>",
  "evidence": [
    {{
      "document_name": "<pdf file name>",
      "page": <page_number_int>,
      "section": "<section or page header>",
      "content": "<exact text snippet from PDF>"
    }}
  ]
}}

Rules:
- If the context does not contain enough information to answer, set "answer" to "{NOT_FOUND}" and "evidence" to [].
- "content" must be copied verbatim from the context (a short, relevant excerpt), not paraphrased.
- "document_name", "page", and "section" must match the bracketed metadata of the block the excerpt came from.
- "page" must be an integer.
- Keep the answer concise and factual."""


@app.get("/health")
def health():
    with store_lock:
        documents = sorted({c.document_name for c in chunk_store})
        chunk_count = len(chunk_store)
    return {"status": "ok", "documents": documents, "chunks": chunk_count}


@app.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    filename = os.path.basename(file.filename or "")
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are supported.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 25 MB limit.")

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            reader.decrypt("")
        pages = reader.pages
    except (PdfReadError, Exception) as exc:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc

    new_chunks: List[Chunk] = []
    for page_index, page in enumerate(pages, start=1):
        try:
            raw_text = page.extract_text() or ""
        except Exception:
            raw_text = ""
        text = normalize_whitespace(raw_text)
        if not text:
            continue
        section = detect_section(text, page_index)
        for piece in split_into_chunks(text):
            new_chunks.append(
                Chunk(document_name=filename, page=page_index, section=section, content=piece)
            )

    if not new_chunks:
        raise HTTPException(
            status_code=422,
            detail="No extractable text found. The PDF may be scanned images without OCR.",
        )

    with store_lock:
        chunk_store[:] = [c for c in chunk_store if c.document_name != filename]
        chunk_store.extend(new_chunks)

    return UploadResponse(
        status="success",
        document_name=filename,
        pages_processed=len(pages),
        chunks_created=len(new_chunks),
    )


@app.delete("/documents")
def clear_documents():
    with store_lock:
        chunk_store.clear()
    return {"status": "cleared"}


@app.post("/query", response_model=QueryResponse)
def query_documents(payload: QueryRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question must not be empty.")

    with store_lock:
        chunks = list(chunk_store)
    if not chunks:
        raise HTTPException(status_code=400, detail="No documents indexed. Upload a PDF first.")

    client = get_client()
    context = build_context(select_context(question, chunks))

    try:
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"PDF CONTEXT:\n\n{context}\n\nQUESTION: {question}",
                },
            ],
        )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {exc}") from exc

    raw = completion.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON.") from exc

    answer = str(parsed.get("answer") or NOT_FOUND).strip() or NOT_FOUND
    evidence: List[Evidence] = []
    for item in parsed.get("evidence") or []:
        if not isinstance(item, dict):
            continue
        try:
            page = int(item.get("page"))
        except (TypeError, ValueError):
            continue
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        evidence.append(
            Evidence(
                document_name=str(item.get("document_name") or ""),
                page=page,
                section=str(item.get("section") or f"Page {page}"),
                content=content,
            )
        )

    if answer == NOT_FOUND:
        evidence = []

    return QueryResponse(answer=answer, evidence=evidence)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

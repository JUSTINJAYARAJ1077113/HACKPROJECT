import { useRef, useState } from "react";
import { ArrowUpRight, Check, FileText, LoaderCircle, LockKeyhole, MessageSquareText, Sparkles, UploadCloud } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Something went wrong. Please try again.");
  return data;
}

export default function App() {
  const inputRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [fileName, setFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function uploadFile(file) {
    if (!file) return;
    setError("");
    setResult(null);
    setDocument(null);
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file to get started.");
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setUploading(true);
    try {
      const response = await fetch(API_BASE + "/upload", { method: "POST", body });
      const data = await readResponse(response);
      setDocument(data);
      setFileName(data.filename);
    } catch (err) {
      setError(err.message || "The PDF could not be processed.");
      setFileName("");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    if (!document || !question.trim() || asking) return;
    setError("");
    setResult(null);
    setAsking(true);
    try {
      const response = await fetch(API_BASE + "/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: document.document_id, question: question.trim() }),
      });
      setResult(await readResponse(response));
    } catch (err) {
      setError(err.message || "The question could not be answered.");
    } finally {
      setAsking(false);
    }
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    uploadFile(event.dataTransfer.files?.[0]);
  }

  const canAsk = Boolean(document && question.trim() && !asking);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="DocuMind AI home">
          <span className="brand-mark"><FileText size={19} strokeWidth={2.2} /></span>
          <span>documind<span className="brand-ai">.ai</span></span>
        </a>
        <div className="topbar-right"><span className="secure-dot" /> Evidence-first answers, every time</div>
      </header>

      <main id="top" className="main-layout">
        <section className="intro">
          <div className="eyebrow"><Sparkles size={14} /> DOCUMENT INTELLIGENCE</div>
          <h1>Answers grounded<br />in <span>your documents.</span></h1>
          <p className="intro-copy">Ask a question. Get a clear answer with the exact page and passage it came from.</p>
          <div className="trust-row"><span><Check size={14} /> Page-level sources</span><span><Check size={14} /> No made-up answers</span></div>
        </section>

        <section className="workspace" aria-label="PDF question and answer">
          <div className="workspace-head">
            <div><div className="section-kicker">YOUR WORKSPACE</div><h2>Ask your document</h2></div>
            <div className="step-badge"><span>01</span> Upload <i /> <span>02</span> Ask</div>
          </div>

          <div className={"upload-panel " + (dragging ? "is-dragging " : "") + (document ? "has-document" : "")}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)} onDrop={onDrop}>
            <input ref={inputRef} className="file-input" type="file" accept="application/pdf,.pdf" onChange={(event) => uploadFile(event.target.files?.[0])} />
            {uploading ? (
              <div className="upload-content"><span className="upload-icon loading-icon"><LoaderCircle size={22} /></span><div><strong>Reading your PDF…</strong><p>Extracting page text and preparing sources</p></div></div>
            ) : document ? (
              <div className="upload-content"><span className="upload-icon success-icon"><Check size={21} /></span><div className="file-details"><strong>{fileName}</strong><p>{document.page_count} pages <span className="dot-sep">·</span> {document.chunk_count} searchable passages</p></div><button className="text-button" type="button" onClick={() => inputRef.current?.click()}>Change PDF</button></div>
            ) : (
              <div className="upload-content"><span className="upload-icon"><UploadCloud size={22} /></span><div><strong>Drop a PDF here or <button className="inline-button" type="button" onClick={() => inputRef.current?.click()}>browse files</button></strong><p>PDF only · up to 25 MB</p></div></div>
            )}
          </div>

          <form className="question-form" onSubmit={askQuestion}>
            <label htmlFor="question">YOUR QUESTION</label>
            <div className={"question-box " + (!document ? "is-disabled" : "")}>
              <MessageSquareText size={19} className="question-icon" />
              <input id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={document ? "Ask anything about this PDF…" : "Upload a PDF to start asking"} disabled={!document || asking} maxLength={1000} />
              <button className="ask-button" type="submit" disabled={!canAsk}>{asking ? <LoaderCircle size={17} className="spinner" /> : <>Ask <ArrowUpRight size={16} /></>}</button>
            </div>
            <div className="form-foot"><span>{document ? "Answers are based only on the text in this PDF." : "Your PDF's text is processed to find relevant passages."}</span><span>{question.length}/1000</span></div>
          </form>

          {error && <div className="error-box" role="alert"><span>!</span>{error}</div>}
          {asking && <div className="answer-loading"><LoaderCircle size={18} className="spinner" /><span>Finding the right passages and checking the answer…</span></div>}
          {result && <div className="results" aria-live="polite">
            <section className="answer-card">
              <div className="result-label"><span className="result-icon"><Sparkles size={15} /></span> ANSWER</div>
              <p>{result.answer}</p>
            </section>
            {result.evidence?.length > 0 && <section className="evidence-section">
              <div className="evidence-heading"><div><div className="result-label"><span className="evidence-icon"><FileText size={15} /></span> SOURCE EVIDENCE</div><p>These passages support the answer.</p></div><span className="source-count">{result.evidence.length} {result.evidence.length === 1 ? "source" : "sources"}</span></div>
              <div className="evidence-list">{result.evidence.map((source, index) => <article className="evidence-card" key={source.document + "-" + source.page + "-" + index}>
                <div className="source-meta"><span className="page-tag">PAGE {source.page}</span><span className="source-name"><FileText size={13} /> {source.document}</span></div>
                <div className="source-section">{source.section}</div>
                <blockquote>{source.content}</blockquote>
              </article>)}</div>
            </section>}
          </div>}
          {!result && !error && !asking && <div className="empty-state"><span className="empty-icon"><LockKeyhole size={18} /></span><div><strong>{document ? "Ready when you are" : "Your answer will appear here"}</strong><p>{document ? "Ask a specific question to see a grounded answer and its sources." : "Upload a PDF, then ask a question. Sources will include page numbers and extracted text."}</p></div></div>}
        </section>

        <footer className="page-footer"><span>DOCUMIND AI <span className="footer-divider">/</span> HACKPROJECT MVP</span><span>Text-based PDFs · Evidence with every answer</span></footer>
      </main>
    </div>
  );
}

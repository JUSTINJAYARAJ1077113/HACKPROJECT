import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";

export default function UploadCard({ state, documents, onUpload }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const uploading = state.status === "uploading";

  function selectFile(selected) {
    if (selected && selected.name.toLowerCase().endsWith(".pdf")) {
      setFile(selected);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || uploading) return;
    await onUpload(file);
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold">Document upload</h2>
      <p className="mt-1 text-xs text-muted">Index a PDF to start asking questions.</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <label
          htmlFor="pdf-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            selectFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-border hover:border-muted hover:bg-surface-raised"
          }`}
        >
          <UploadCloud className="size-6 text-muted" aria-hidden="true" />
          <span className="text-sm">{file ? file.name : "Choose a PDF or drag it here"}</span>
          <span className="text-xs text-muted">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Max 25 MB"}</span>
          <input
            ref={inputRef}
            id="pdf-input"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
        </label>

        <button
          type="submit"
          disabled={!file || uploading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}
          {uploading ? "Uploading..." : "Upload & index"}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === "success" && (
          <p className="mt-3 flex items-start gap-2 text-xs text-accent">
            <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
        )}
        {state.status === "error" && (
          <p className="mt-3 flex items-start gap-2 text-xs text-danger">
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
        )}
      </div>

      {documents.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Indexed</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {documents.map((doc) => (
              <li key={doc.document_name} className="flex items-center gap-2 rounded-md bg-surface-raised px-3 py-2">
                <FileText className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-sm" title={doc.document_name}>
                  {doc.document_name}
                </span>
                <span className="shrink-0 text-xs text-muted">{doc.pages} pp</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

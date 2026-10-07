import { FileSearch } from "lucide-react";

export default function Header({ documentCount }) {
  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <FileSearch className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">HACKPROJECT</h1>
            <p className="text-xs text-muted">Grounded answers from your PDFs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted">
          <span
            className={`size-2 rounded-full ${documentCount > 0 ? "bg-accent" : "bg-muted"}`}
            aria-hidden="true"
          />
          {documentCount} {documentCount === 1 ? "document" : "documents"} indexed
        </div>
      </div>
    </header>
  );
}

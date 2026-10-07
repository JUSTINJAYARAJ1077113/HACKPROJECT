import { FileText } from "lucide-react";

export default function EvidenceCard({ evidence }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-raised px-2 py-1 text-muted">
          <FileText className="size-3.5" aria-hidden="true" />
          <span className="max-w-48 truncate" title={evidence.document_name}>
            {evidence.document_name}
          </span>
        </span>
        <span className="rounded-md bg-accent/10 px-2 py-1 font-medium text-accent">Page {evidence.page}</span>
        <span className="min-w-0 truncate text-muted" title={evidence.section}>
          {evidence.section}
        </span>
      </div>
      <blockquote className="mt-3 border-l-2 border-accent/60 pl-3 font-mono text-[13px] leading-relaxed text-foreground/90">
        {evidence.content}
      </blockquote>
    </article>
  );
}

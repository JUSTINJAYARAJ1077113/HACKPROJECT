import { AlertTriangle, CheckCircle2, MessageSquareText, SearchX, XCircle } from "lucide-react";
import EvidenceCard from "./EvidenceCard.jsx";

function Notice({ tone, icon: Icon, title, children }) {
  const tones = {
    success: "border-accent/40 bg-accent/10 text-accent",
    warning: "border-warning/40 bg-warning/10 text-warning",
    danger: "border-danger/40 bg-danger/10 text-danger",
  };
  return (
    <div className={`rounded-xl border p-5 ${tones[tone]}`} role={tone === "danger" ? "alert" : "status"}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

export default function ResponsePanel({ state }) {
  if (state.status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <MessageSquareText className="size-8 text-muted" aria-hidden="true" />
        <p className="text-sm text-muted text-pretty">Your answer and its supporting evidence will appear here.</p>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading answer">
        <div className="h-24 animate-pulse rounded-xl bg-surface" />
        <div className="h-32 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Notice tone="danger" icon={XCircle} title="Something went wrong">
        {state.error}
      </Notice>
    );
  }

  const { answer, evidence } = state.result;
  const notFound = !answer || answer === "NOT_FOUND";

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <p className="text-xs text-muted">
        <span className="font-medium text-foreground">Q:</span> {state.question}
      </p>

      {notFound ? (
        <Notice tone="warning" icon={SearchX} title="Answer not found">
          The indexed documents do not contain enough information to answer this question. Try rephrasing or upload a more relevant PDF.
        </Notice>
      ) : (
        <Notice tone="success" icon={CheckCircle2} title="Answer">
          <p className="whitespace-pre-wrap">{answer}</p>
        </Notice>
      )}

      {!notFound && (
        <div>
          <h2 className="text-sm font-semibold">
            Supporting evidence <span className="font-normal text-muted">({evidence.length})</span>
          </h2>
          {evidence.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-warning">
              <AlertTriangle className="size-4" aria-hidden="true" />
              No verbatim evidence was returned. Verify this answer against the source document.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {evidence.map((item, index) => (
                <li key={`${item.document_name}-${item.page}-${index}`}>
                  <EvidenceCard evidence={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

export default function QueryCard({ disabled, loading, onSubmit }) {
  const [question, setQuestion] = useState("");
  const canSubmit = !disabled && !loading && question.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    onSubmit(question.trim());
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <label htmlFor="question-input" className="text-sm font-semibold">
        Ask a question
      </label>
      <p className="mt-1 text-xs text-muted">
        {disabled ? "Upload a PDF first to enable questions." : "Answers are grounded strictly in your indexed documents."}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          id="question-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault();
          }}
          disabled={disabled}
          maxLength={2000}
          placeholder="e.g. What is the termination notice period?"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="size-4" aria-hidden="true" />}
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>
    </form>
  );
}

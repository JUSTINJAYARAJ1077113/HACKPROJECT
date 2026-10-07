import { useState } from "react";
import Header from "./components/Header.jsx";
import UploadCard from "./components/UploadCard.jsx";
import QueryCard from "./components/QueryCard.jsx";
import ResponsePanel from "./components/ResponsePanel.jsx";
import { askQuestion, uploadPdf } from "./api.js";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [uploadState, setUploadState] = useState({ status: "idle", message: "" });
  const [queryState, setQueryState] = useState({ status: "idle", error: "", result: null, question: "" });

  async function handleUpload(file) {
    setUploadState({ status: "uploading", message: "Uploading..." });
    try {
      const data = await uploadPdf(file);
      setDocuments((prev) => [
        ...prev.filter((d) => d.document_name !== data.document_name),
        { document_name: data.document_name, pages: data.pages_processed, chunks: data.chunks_created },
      ]);
      setUploadState({
        status: "success",
        message: `Document successfully indexed! ${data.pages_processed} pages processed.`,
      });
    } catch (error) {
      setUploadState({ status: "error", message: error.message });
    }
  }

  async function handleQuery(question) {
    setQueryState({ status: "loading", error: "", result: null, question });
    try {
      const result = await askQuestion(question);
      setQueryState({ status: "success", error: "", result, question });
    } catch (error) {
      setQueryState({ status: "error", error: error.message, result: null, question });
    }
  }

  return (
    <div className="min-h-screen">
      <Header documentCount={documents.length} />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-start md:px-6">
        <aside className="flex w-full flex-col gap-6 md:w-80 md:shrink-0">
          <UploadCard state={uploadState} documents={documents} onUpload={handleUpload} />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col gap-6" aria-label="Ask and review answers">
          <QueryCard
            disabled={documents.length === 0}
            loading={queryState.status === "loading"}
            onSubmit={handleQuery}
          />
          <ResponsePanel state={queryState} />
        </section>
      </main>
    </div>
  );
}

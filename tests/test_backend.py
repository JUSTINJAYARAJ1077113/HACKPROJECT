from backend.main import chunk_text, make_page_chunks, retrieve_chunks


def test_chunk_text_preserves_content_and_overlaps():
    text = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu"
    chunks = chunk_text(text, max_chars=28, overlap=8)
    assert len(chunks) > 1
    assert all(chunks)
    assert "alpha" in chunks[0]
    assert "mu" in chunks[-1]
    assert any(set(a.split()) & set(b.split()) for a, b in zip(chunks, chunks[1:]))


def test_chunks_keep_document_and_page_metadata():
    chunks = make_page_chunks("doc-1", "report.pdf", 7, "Revenue\nThe annual revenue was 42 million dollars.")
    assert chunks
    assert all(item["document"] == "report.pdf" for item in chunks)
    assert all(item["page"] == 7 for item in chunks)
    assert all(item["section"] == "Revenue" for item in chunks)


def test_retrieval_ranks_matching_passage_and_ignores_unrelated_passage():
    chunks = [
        {"content": "The Q4 revenue reached 42 million dollars, a 12 percent increase."},
        {"content": "The office will close for a maintenance break next Friday."},
    ]
    results = retrieve_chunks(chunks, "What was Q4 revenue?", limit=2)
    assert len(results) == 1
    assert "42 million" in results[0]["content"]


def test_retrieval_returns_empty_for_unmatched_question():
    chunks = [{"content": "The company reported 42 million dollars of annual revenue."}]
    assert retrieve_chunks(chunks, "What color was the office building?") == []

---
title: Business Logic — Upload & RAG Pipeline
tags: [pipeline, rag, upload, ocr, enrichment, embedding]
related: [rag-pipeline.md, api-routes.md, database-schema.md, gemini-integration.md]
updated: 2026-05-01
---

# 🧠 Business Logic

The core of the app is the **upload pipeline** (one-time per document) and the **chat pipeline** (per query). Both are implemented in [server.py](../../server.py).

## 📥 Upload Pipeline

Triggered by `POST /api/upload`, runs in a background thread (so HTTP returns immediately):

```
1. SAVE        → uploads/<8-hex-id>.<ext>           (api_upload, server.py:2099)
2. EXTRACT     → text from PDF/DOCX/XLSX/TXT/MD/CSV/JSON
                 PDF: PyMuPDF + PyPDF2 best-of, OCR fallback
                 DOCX: python-docx (paragraphs + tables)
                 XLSX: openpyxl (all sheets, key-value if 2 cols)
                 (extract_text @ server.py:514)
3. CHUNK       → section-aware, ~800 chars / 100 overlap
                 Respects: ## headings, ---Page N, Thai/Arabic numbered lists
                 (chunk_text @ server.py:864)
4. ENRICH ‖     → Gemini batch (~30 chunks): summary + 2-3 questions per chunk
                 Parallel using all GEMINI_KEYS
                 (_enrich_chunks_parallel @ server.py:981)
   EMBED ‖     → Gemini embedding-001, 3072-dim, batch 100, RETRIEVAL_DOCUMENT
                 Run in PARALLEL with enrich (two threads, .join())
                 (_batch_embed_gemini @ server.py:1152)
5. RE-EMBED    → For chunks that got summaries, re-embed (summary + text) for better recall
6. PERSIST     → SQLite chunks table + FAISS index + uploads/_text_cache/<id>_enriched.json
                 (_db_upsert_chunks, _faiss_add, _save_enriched_cache)
7. PROGRESS    → upload_progress[doc_id] updated at each step
                 Polled by client via /api/upload/progress/<id>
```

## 💬 Chat Pipeline (Level-4 RAG)

Triggered by `POST /api/chat` with `{question}`. See [rag-pipeline](rag-pipeline.md) for full agentic flow.

```
1. _level4_pipeline(q, history)            (server.py:1784)
2. → _agent_classify       — simple? complex? need decompose?
3. → _multi_query_search   — 2 query variants → search_docs (hybrid)
4. → _ai_rerank            — Gemini ranks chunks for relevance
5. → ai_respond            — Gemini composes Thai answer with citations
6. → _agent_reflect        — completeness check
7. → (optional) _agent_decompose_search + _agent_refine_answer
8. Append to chat_history (last 50 in-memory)
```

## 🔍 Hybrid Search

`search_docs` (server.py:1279) combines:

- **Vector**: FAISS top-60 by cosine similarity
- **Keyword**: BM25-like token overlap on chunk text + summary + questions
- **Fusion**: Reciprocal Rank Fusion (RRF) → top-15

## 📂 Supported File Types

`ALLOWED_EXT = {'.pdf', '.docx', '.doc', '.txt', '.csv', '.xlsx', '.xls', '.md', '.json'}`
Max size: **50 MB**.

## 🔁 Re-process / Re-index

- `POST /api/reindex` — re-runs enrichment for ALL docs (text already cached)
- `POST /api/reprocess/<id>` — full re-run from disk (clears text + enriched cache, re-OCR)

## ⚠️ Gotchas

- Enrichment is skipped when `total > 500` chunks (avoids RPM exhaustion)
- `SKIP_ENRICHMENT = False` constant — flip to True for fast-mode dev
- OCR uses **single-page** Gemini Vision to avoid hallucination; `MAX_CHARS_PER_PAGE = 8000`
- After OCR, embed/enrich waits up to 10s if all keys are on cooldown

## 🔗 Related
- [rag-pipeline](rag-pipeline.md) — Level-4 detail
- [database-schema](database-schema.md) — what gets persisted
- [gemini-integration](gemini-integration.md) — key rotation
- [api-routes](api-routes.md) — HTTP surface


## 📚 Step 6: BUILD_WIKI (auto-generated per-doc wiki)

After EMBED+SAVE, the pipeline calls `_build_doc_wiki(doc_id, name, chunks)` which makes ONE Gemini call to produce a JSON wiki: `summary, tags, entities, sections, key_points, suggested_questions`. Stored at `uploads/_wiki/<doc_id>.json` (+`.md`). A cross-doc `uploads/_wiki/index.json` is rebuilt via `_rebuild_wiki_index()`. Failures are non-fatal — upload still completes.

On `DELETE /api/docs/<id>` the wiki file is removed via `_delete_doc_wiki(doc_id)`.

See also [storage-layout](storage-layout.md) and [api-routes](api-routes.md).

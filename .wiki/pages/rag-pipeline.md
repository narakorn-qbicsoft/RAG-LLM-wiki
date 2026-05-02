---
title: RAG Pipeline (Level 4 Agentic)
tags: [rag, pipeline, search, embedding, gemini]
related: [business-logic.md, gemini-integration.md, database-schema.md]
updated: 2026-05-01
---

# 🧠 Level-4 Agentic RAG Pipeline

Implemented in [server.py](../../server.py) `_level4_pipeline` (~line 1784) and called from `/api/chat`.

## 🪜 Stages

| # | Function | Lines | Role |
|---|----------|------:|------|
| 1 | `_agent_classify` | 1641 | Decide: trivial / direct-search / decompose |
| 2 | `_rewrite_query` | 1411 | Generate 2 query reformulations |
| 3 | `_multi_query_search` | 1456 | Run hybrid search per variant + dedupe |
| 4 | `search_docs` | 1279 | Hybrid: FAISS + keyword + RRF |
| 5 | `_ai_rerank` | 1495 | Gemini reranks chunks by relevance |
| 6 | `_compress_context` | 1577 | Trim long chunks while preserving facts |
| 7 | `ai_respond` | 1993 | Compose Thai answer with citations |
| 8 | `_agent_reflect` | 1714 | Self-critique: is the answer complete? |
| 9a | `_agent_decompose_search` | 1682 | Break into sub-questions if reflect says incomplete |
| 9b | `_agent_refine_answer` | 1752 | Re-answer with extra context |

## 🔍 Hybrid Search Detail (`search_docs`)

```
query → _embed_query (gemini-embedding-001, RETRIEVAL_QUERY)
      → FAISS top-60 (cosine sim, IndexFlatIP, L2-normalized)
      → keyword scoring (token overlap on text + summary + questions)
      → RRF fusion (k=60)
      → top-15 chunks
```

Each chunk hit = `{doc_id, chunk_index, score, vec_score, kw_score}`.

## 🧮 Embeddings

- Model: `gemini-embedding-001`
- Dim: **3072** (`EMBED_DIM` constant at server.py:38)
- Index type: `faiss.IndexFlatIP` (exact, cosine via L2-normalize)
- Stored in: `uploads/faiss.index` + `uploads/faiss_map.json`
- Doc embeddings: `task_type='RETRIEVAL_DOCUMENT'`
- Query embeddings: `task_type='RETRIEVAL_QUERY'`

## 🤖 Models Used

| Purpose | Model | Constant |
|---------|-------|----------|
| Content generation | gemini-2.5-flash | `GEMINI_CONTENT_MODEL` |
| Chat answer | gemini-2.5-flash | `GEMINI_CHAT_MODEL` |
| Vision OCR | gemini-2.5-flash | `GEMINI_OCR_MODEL` |
| Embeddings | gemini-embedding-001 | `GEMINI_EMBED_MODEL` |

## 🔄 Conversation Memory

- `chat_history` global list, last 50 turns
- Last 6 turns passed into `_level4_pipeline(history=...)` for follow-ups
- Cleared via `POST /api/chat/clear`

## ⚠️ Gotchas

- `_ai_rerank` and `_agent_*` each consume Gemini quota — heavy questions burn ~5–8 LLM calls
- If FAISS is empty (no docs uploaded), pipeline short-circuits to a friendly "please upload" message
- `chunks` text inside FAISS search is hydrated from SQLite via `_db_get_chunks_for_docs` (batched)

## 🔗 Related
- [business-logic](business-logic.md) — full upload + chat overview
- [database-schema](database-schema.md) — chunk store
- [gemini-integration](gemini-integration.md) — quotas/keys

---
title: Database Schema
tags: [database, sqlite, faiss, storage]
related: [storage-layout.md, business-logic.md]
updated: 2026-05-01
---

# 💾 Database Schema

The app uses **3 storage layers**, all under `uploads/`:

## 1. SQLite — `uploads/rag.db`

Created by `_init_database()` (server.py:247). WAL mode, `synchronous=NORMAL`.

### Table: `chunks`

| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | row id |
| `doc_id` | TEXT NOT NULL | 8-hex doc identifier (matches file in `uploads/<id>.<ext>`) |
| `chunk_index` | INTEGER NOT NULL | 0-based position within doc |
| `text` | TEXT NOT NULL | raw chunk text (~800 chars) |
| `summary` | TEXT DEFAULT '' | Gemini-generated 1-2 sentence Thai summary |
| `questions` | TEXT DEFAULT '[]' | JSON array of Thai questions this chunk can answer |
| `section` | TEXT DEFAULT '' | section/heading the chunk came from (currently mostly empty) |

Constraints:
- `UNIQUE(doc_id, chunk_index)`
- Index: `idx_chunks_doc ON chunks(doc_id)`

Access functions (all server.py):
- `_db_upsert_chunks(doc_id, chunks)` — DELETE + INSERT pattern
- `_db_remove_doc(doc_id)` — DELETE all rows for a doc
- `_db_get_doc_chunks(doc_id)` — load one doc's chunks
- `_db_get_chunks_for_docs(doc_ids)` — batch load (used after FAISS hits)
- `_db_total_chunks()`, `_db_doc_chunk_count(doc_id)` — counts

## 2. FAISS — `uploads/faiss.index` + `uploads/faiss_map.json`

- Type: `faiss.IndexFlatIP` (exact inner product, cosine via L2-normalize)
- Dim: **3072** (`EMBED_DIM`)
- `faiss_map.json`: parallel array `[{doc_id, chunk_index}, ...]` — maps FAISS row → SQLite chunk
- Concurrency: protected by `_faiss_lock`
- Functions: `_init_faiss_index`, `_faiss_add`, `_faiss_remove`, `_faiss_search`, `_save_faiss`

## 3. JSON Metadata — `uploads/_metadata.json`

Document registry persisted on every upload/delete. Schema:

```json
[
  {
    "id": "abc12345",
    "name": "report.pdf",
    "ext": ".pdf",
    "size": 1234567,
    "path": "/abs/path/uploads/abc12345.pdf",
    "uploadedAt": "2026-05-01 10:30",
    "wordCount": 4567,
    "chunkCount": 23
  }
]
```

Loaded by `_load_metadata()` on startup; saved by `_save_metadata()`.

## 4. Cache files — `uploads/_text_cache/`

| File | Format | Purpose |
|------|--------|---------|
| `<doc_id>.txt` | UTF-8 text | Cached extraction (skips re-OCR) |
| `<doc_id>_enriched.json` | JSON | `{docType, chunks: [{text, section, summary, questions, embedding}]}` — full enriched chunks incl. embeddings |

## 🔁 In-memory mirrors

After `_load_metadata()` + `_migrate_to_db()` on startup:
- `documents: list[dict]` — doc records
- `enriched_store: dict[doc_id, {chunks}]` — full enriched data with embeddings
- `chat_history: list[dict]` — last 50 turns
- `upload_progress: dict[doc_id, dict]` — pipeline progress per doc

## ⚠️ Gotchas

- **No migrations** — schema changes require manual `ALTER TABLE` or delete `rag.db`
- **No FK constraints** — orphaned chunks possible if direct DB edits made
- `_text_cache/` is the source of truth for **embeddings**; SQLite stores text + summaries but NOT embeddings (FAISS does)
- Multi-worker gunicorn: SQLite + FAISS files are shared, but in-memory `documents`/`chat_history`/`upload_progress` are **per-worker** → state inconsistency

## 🔗 Related
- [storage-layout](storage-layout.md) — directory tree
- [business-logic](business-logic.md) — when each layer is written

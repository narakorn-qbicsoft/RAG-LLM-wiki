---
title: Storage Layout
tags: [storage, ops, database]
related: [database-schema.md, deployment.md]
updated: 2026-05-01
---

# 📁 Storage Layout

All persistent state lives under `uploads/` (created automatically on startup).

```
uploads/
├── _metadata.json          ← document registry (id, name, size, path, ...)
├── rag.db                  ← SQLite (chunks table, WAL mode)
├── rag.db-wal              ← SQLite write-ahead log (auto)
├── rag.db-shm              ← SQLite shared memory (auto)
├── faiss.index             ← FAISS IndexFlatIP, 3072-dim vectors
├── faiss_map.json          ← parallel array: faiss_row → {doc_id, chunk_index}
├── _text_cache/
│   ├── <doc_id>.txt              ← extracted text cache (skip re-OCR)
│   └── <doc_id>_enriched.json    ← {docType, chunks:[{text,summary,questions,embedding}]}
└── <doc_id>.<ext>          ← original uploaded file (8-hex id, e.g. a1b2c3d4.pdf)
```

## 🔢 Constants (server.py:29-44)

```python
BASE_DIR       = directory of server.py
UPLOAD_FOLDER  = BASE_DIR/uploads
TEXT_CACHE     = UPLOAD_FOLDER/_text_cache
DB_PATH        = UPLOAD_FOLDER/rag.db
FAISS_PATH     = UPLOAD_FOLDER/faiss.index
FAISS_MAP_PATH = UPLOAD_FOLDER/faiss_map.json
METADATA_PATH  = UPLOAD_FOLDER/_metadata.json
EMBED_DIM      = 3072
MAX_FILE_SIZE  = 50 MB
ALLOWED_EXT    = {.pdf .docx .doc .txt .csv .xlsx .xls .md .json}
```

## 🧹 Cleanup Operations

| Action | Removes |
|--------|---------|
| `DELETE /api/documents/<id>` | Original file, both cache files, SQLite chunks, FAISS vectors, in-mem entry |
| `POST /api/reprocess/<id>` | Both cache files (with `.bak` backup), SQLite chunks, FAISS vectors → then re-runs full pipeline |
| Manual reset | `rm -rf uploads/` and restart |

## ⚠️ Gotchas

- Deleting `_metadata.json` orphans all uploaded files
- Deleting `rag.db` but keeping `_text_cache/` — startup `_migrate_to_db()` will rebuild from cache
- Deleting `faiss.index` — startup creates empty index; `_migrate_to_db()` re-adds vectors from `_text_cache/<id>_enriched.json`

## 🔗 Related
- [database-schema](database-schema.md) — table/index detail
- [business-logic](business-logic.md) — write paths


## 📚 `uploads/_wiki/`

Auto-generated document wikis (1 per uploaded doc).

```
uploads/_wiki/
  <doc_id>.json   # structured wiki: {summary, tags, entities, sections, key_points, suggested_questions}
  <doc_id>.md     # rendered markdown view
  index.json      # aggregate: {docs, top_tags, top_entities, tag_cooccurrence}
```

Managed by `_build_doc_wiki()`, `_load_doc_wiki()`, `_delete_doc_wiki()`, `_rebuild_wiki_index()` in [server.py](../../server.py).

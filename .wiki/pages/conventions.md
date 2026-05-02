---
title: Code Conventions
tags: [conventions, meta]
related: [project-overview.md, ui-pages.md]
updated: 2026-05-01
---

# 📐 Code Conventions

## 🐍 Python ([server.py](../../server.py))

### Structure
- Single file, split by `# ═══` ASCII-banner headers
- All globals live at top of relevant section (no classes, no DI)
- Background work via `threading.Thread(daemon=True)` and `concurrent.futures.ThreadPoolExecutor`

### Naming
- Public functions / Flask routes: `api_xxx` (handlers) or plain verbs (`extract_text`, `chunk_text`, `search_docs`)
- Private/internal helpers: `_underscore_prefix` (e.g. `_db_upsert_chunks`, `_faiss_add`)
- Module-level constants: `UPPER_SNAKE` (e.g. `EMBED_DIM`, `MAX_FILE_SIZE`, `ALLOWED_EXT`)
- Mutable globals: `lower_snake` (e.g. `documents`, `chat_history`, `enriched_store`, `upload_progress`, `key_usage`, `faiss_index`, `faiss_id_map`)

### Logging
- `print(..., flush=True)` everywhere (no logging module)
- Emoji-prefixed for grep-ability: `📂` load, `💾` save, `🔍` search, `✨` enrich, `🚀` start, `✅` ok, `❌` fail, `⏳`/`⏸️` wait, `🗑️` cleanup, `⚠️` warn

### Concurrency
- Locks: `_db_lock`, `_faiss_lock` (module-level `threading.Lock`)
- SQLite uses WAL mode + `timeout=30` per connection
- All FAISS mutations inside `with _faiss_lock:`

### Error handling
- `try/except Exception` at API boundary — never raise to Flask
- User-facing errors are **Thai strings** in JSON `{error: "..."}`

## 🟨 JavaScript ([app.js](../../app.js))

- Single IIFE: `(function () { 'use strict'; ... })()`
- DOM access via `$('#id')` / `$$('.cls')` shortcuts
- Hard-coded element IDs match [index.html](../../index.html) — see [ui-pages](ui-pages.md)
- All async with `await fetch(...)` (no axios)
- State: module-scoped `let documents = []; let isSending = false;` etc.
- No build step — vanilla ES2017+, runs directly in modern browsers

## 🎨 CSS ([styles.css](../../styles.css))

- CSS custom properties (theme variables) at `:root`
- Mobile-first: sidebar breakpoint at ~768px
- Component classes: `kebab-case` (`upload-zone`, `pipeline-step`, `doc-card`)
- State modifiers: `.active` / `.done` / `.error` / `.pending` / `.open`

## 🌐 API Contract

- All endpoints under `/api/*`
- Errors: `{"error": "<thai-message>"}` with HTTP 400/404
- Successful chat: see [api-routes](api-routes.md) §"Chat success"
- Body field for chat is `question` **not** `message`

## 📁 File Conventions

- Backups: `*.bak_<reason>` (e.g. `server.py.bak_before_db`) — kept in repo root for rollback
- Doc IDs: `uuid.uuid4().hex[:8]` (8 hex chars)
- Cache files: `<doc_id>.txt` and `<doc_id>_enriched.json` in `uploads/_text_cache/`

## 🌍 Language

- UI text & user-facing errors: **Thai**
- Code identifiers, comments, log messages: **English**
- Prompts to Gemini: usually **bilingual** (Thai instructions for OCR/enrichment of Thai docs)

## 🔗 Related
- [project-overview](project-overview.md)
- [ui-pages](ui-pages.md)

---
title: API Routes
tags: [api, http, flask]
related: [ui-pages.md, business-logic.md, rag-pipeline.md]
updated: 2026-05-01
---

# 🔌 API Routes

All routes are registered in [server.py](../../server.py) on the global `app = Flask(...)`. CORS is enabled for all origins.

## 🌐 Static / SPA

| Method | Path | Function | Lines | Purpose |
|--------|------|----------|------:|---------|
| GET | `/` | `serve_index` | 2082 | Returns `index.html` |
| GET | `/favicon.ico` | `favicon` | 2086 | 204 No Content |
| GET | `/<path:path>` | `serve_static` | 2090 | Serves any other file from `BASE_DIR` (404 if path starts with `api/`) |

## 📥 Upload

| Method | Path | Function | Lines | Body / Returns |
|--------|------|----------|------:|---------|
| POST | `/api/upload` | `api_upload` | 2099 | multipart `file` → `{success, document, processing:true}`, kicks off background pipeline |
| GET | `/api/upload/progress/<doc_id>` | `api_upload_progress` | 2374 | `{status, progress, message, steps:[{name,status,detail,duration?,elapsed?}], timing}` |

## 📁 Documents

| Method | Path | Function | Lines | Returns |
|--------|------|----------|------:|---------|
| GET | `/api/documents` | `api_documents` | 2292 | `{documents:[{id,name,ext,size,uploadedAt,wordCount,chunkCount}], totalChunks, totalWords}` |
| DELETE | `/api/documents/<doc_id>` | `api_delete_doc` | 2305 | Removes file + caches + SQLite + FAISS + in-mem |
| GET | `/api/documents/<doc_id>/preview` | `api_preview` | 2328 | `{name, text:first10000chars, wordCount, chunkCount}` |
| POST | `/api/reprocess/<doc_id>` | `api_reprocess` | 2438 | Clear caches & re-run full pipeline (background) |
| POST | `/api/reindex` | `api_reindex` | 2416 | Re-run enrichment for ALL docs |

## 💬 Chat

| Method | Path | Function | Lines | Body / Returns |
|--------|------|----------|------:|---------|
| POST | `/api/chat` | `api_chat` | 2343 | Body `{question}` → `{answer, model, provider, sources:[...], documentCount, totalChunks, hitCount}` |
| GET | `/api/chat/history` | `api_chat_history` | 2404 | `{history: last20Turns}` |
| POST | `/api/chat/clear` | `api_chat_clear` | 2408 | `{success:true}` |


## ⚙️ Config (BYOK — Bring Your Own Key)

| Method | Path | Function | Lines | Body / Returns |
|--------|------|----------|------:|---------|
| GET  | `/api/config` | `api_config_get` | ~2693 | `{configured, keyCount, slots:[{slot,set,masked}], envPath}` |
| POST | `/api/config/keys` | `api_config_set_keys` | ~2708 | Body `{GEMINI_API_KEY:"...", ...}` → writes `.env` (chmod 600), hot-reloads `GEMINI_KEYS`, returns `{success, keyCount, configured}` |
| POST | `/api/config/test` | `api_config_test_key` | ~2735 | Body `{key:"AIza..."}` → calls Gemini embed API once → `{ok, message?, error?, status?}` |

Helpers (server.py): `_read_env_file`, `_write_env_file`, `_reload_gemini_keys`, `_mask_key`.

> Used by the **First-Run Setup** overlay and the ⚙ Settings modal in the UI (no shell access required for end-users).

## 📊 Stats

| Method | Path | Function | Lines | Returns |
|--------|------|----------|------:|---------|
| GET | `/api/stats` | `api_stats` | 2631 | `{documentCount, totalWords, totalChunks, hasGemini, geminiKeys, chatCount, enrichment:{<docId>:{chunks,summaries,embeddings}}, dbChunks, faissVectors}` |

## 📦 Common Response Shapes

**Error**:
```json
{"error": "ข้อความภาษาไทย"}
```
Status: 400 / 404.

**Chat success**:
```json
{
  "answer": "markdown-formatted Thai answer with citations",
  "model": "gemini-2.5-flash",
  "provider": "Gemini",
  "sources": [{"doc": "report.pdf", "chunk_index": 7, "score": 0.81}],
  "documentCount": 3,
  "totalChunks": 142,
  "hitCount": 8
}
```


## 📚 Document Wiki Endpoints

### `GET /api/wiki/index`
Returns the cross-document wiki index: list of doc summaries, top tags with counts, top entities, tag co-occurrence graph.
```json
{
  "docs": [{"doc_id": "...", "name": "report.pdf", "summary": "...", "tags": ["finance"]}],
  "top_tags": [["finance", 12], ["risk", 8]],
  "top_entities": [["Acme Corp", 7]],
  "tag_cooccurrence": {"finance|risk": 5}
}
```

### `GET /api/wiki/<doc_id>`
Per-document wiki page (JSON): `{summary, tags, entities, sections, key_points, suggested_questions, generated_at}`. 404 if not built yet.

### `POST /api/wiki/rebuild/<doc_id>`
Force-rebuild the wiki for one document (re-runs Gemini summarization on cached chunks).

### `POST /api/wiki/rebuild`
Rebuild wikis for ALL documents. Long-running.

## ⚠️ Gotchas

- Chat input field is **`question`** (not `message`). Common pitfall when testing with curl.
- Upload returns 200 immediately even though pipeline isn't done — client must poll `/api/upload/progress/<id>` until `status==='done'` or `'error'`.
- DELETE doesn't cascade to `chat_history` — old answers may reference deleted docs.

## 🔗 Related
- [ui-pages](ui-pages.md) — JS calls these endpoints
- [business-logic](business-logic.md) — what happens behind each route

## 🆕 Session / About / Download (added 2026-05-01)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/session` | `{sessionId, myDocs, publicDocs, totalVisible}` |
| POST | `/api/session/reset` | Issue fresh sid, forget current uploads |
| GET | `/about` | Static landing page (about.html) with install guide |
| GET | `/api/download/source` | Stream zip of project source (excludes uploads/, .env, .bak files, >5MB) |

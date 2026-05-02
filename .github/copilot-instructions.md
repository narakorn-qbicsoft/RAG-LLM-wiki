# GitHub Copilot — Project Workflow

This repo carries a **machine-maintained LLM Wiki** at [`.wiki/`](../.wiki/).
It is the canonical source-of-truth context for any AI agent working in this project.

## 🔁 Mandatory Workflow

### 1. QUERY (always, before answering anything non-trivial)

Before responding to any question or planning any change, **first read**:

1. [`.wiki/index.md`](../.wiki/index.md) — page directory
2. [`.wiki/schema.md`](../.wiki/schema.md) — tag vocabulary + drift rules
3. The 1–3 [`.wiki/pages/*.md`](../.wiki/pages/) most relevant to the question

Cite which wiki pages you used.

### 2. INGEST (after every code change)

When you modify code, you must update the wiki **in the same commit**:

| If you change… | Update at minimum |
|---|---|
| `server.py` route handlers (`@app.route`) | `.wiki/pages/api-routes.md` |
| `server.py` `_db_*`, `chunks` table, FAISS code | `.wiki/pages/database-schema.md`, `storage-layout.md` |
| `server.py` RAG / agent / search functions | `.wiki/pages/rag-pipeline.md`, `business-logic.md` |
| `server.py` Gemini key/model/RPM logic | `.wiki/pages/gemini-integration.md` |
| `index.html` ids, `app.js` sections, `styles.css` classes | `.wiki/pages/ui-pages.md` |
| `requirements.txt` | `.wiki/pages/libraries.md` |
| `run.sh`, `.env`, port, deploy steps | `.wiki/pages/deployment.md` |
| Any add/remove of a wiki page | `.wiki/index.md` |

Then append a 1-line entry to [`.wiki/log.md`](../.wiki/log.md) in the form:

```
YYYY-MM-DD <TYPE> <page>.md - <one-line summary>
```
Where `<TYPE>` ∈ `INGEST | EDIT | DELETE | PROMOTE`.

Bump the `updated:` field in the page's frontmatter.

### 3. VALIDATE

Run:
```bash
bash .wiki/sync.sh
```
You must achieve **0 drift items** before considering the change complete.
The sync script checks routes, SQLite tables, packages, ids, function names,
env vars, frontmatter integrity, and index linkage.

## 🚫 Anti-Patterns

- ❌ Don't answer architectural questions without reading the wiki first.
- ❌ Don't add a new HTTP route, env var, or DB column without updating the matching wiki page.
- ❌ Don't write `message` as the chat body field — the API contract is `question`.
- ❌ Don't assume `redis`, `docker`, `npm`, or any framework — none are used here.
- ❌ Don't change `EMBED_DIM` (3072) without rebuilding the FAISS index.

## 🧭 Project Compass (memorize)

- **Backend**: Flask + gunicorn (port 5000) — `server.py` (~2688 lines, no classes)
- **Storage**: SQLite (`uploads/rag.db`, `chunks` table, WAL) + FAISS `IndexFlatIP` 3072-dim
- **LLM**: Gemini 2.5 Flash + `gemini-embedding-001`, 3-key rotation, RPM-aware
- **Pipeline**: Extract → Chunk(800/100) → Enrich ‖ Embed → Re-embed → Persist
- **RAG**: Level-4 agentic — classify → multi-query → hybrid search → AI rerank → respond → reflect → optional decompose+refine
- **Frontend**: vanilla JS IIFE, CDN libs only, single `index.html`
- **Auth**: NONE — must be reverse-proxied

## 🛠️ Local Tools

```bash
bash .wiki/sync.sh                    # drift check (exit 0 = clean)
python3 .wiki/wiki-server.py          # browse wiki at http://localhost:7070
```

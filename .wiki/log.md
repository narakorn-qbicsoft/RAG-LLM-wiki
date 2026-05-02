# 📜 Wiki Change Log

Append-only log of wiki edits. Newest at the top.

Format:
```
## YYYY-MM-DD — author
- (op) page: short description
```

Where `op` is one of: `INGEST`, `LINT-FIX`, `MANUAL`, `REFACTOR`.

---

## 2026-05-01 — copilot
- (INGEST) **api-routes.md**: documented 4 new `/api/wiki/*` endpoints (per-doc wiki + cross-doc index + rebuild)
- (INGEST) **ui-pages.md**: documented Wiki modal UI (`btnWiki`, `wikiModal`, `wikiBody`, `wikiSubtitle`, `wikiBack`, `wikiRebuildAll`, `wikiClose`)
- (INGEST) **business-logic.md**: added Step 6 BUILD_WIKI to upload pipeline
- (INGEST) **storage-layout.md**: added `uploads/_wiki/` directory layout

## 2026-05-01 — copilot
- (INGEST) **api-routes.md**: documented `/api/config`, `/api/config/keys`, `/api/config/test` (BYOK API key management)
- (INGEST) **ui-pages.md**: added Setup modal + First-Run overlay UI elements (`btnSettings`, `setupModal`, `firstRunOverlay`)
- (INGEST) **deployment.md**: documented distributable install (README, setup.sh/bat, .env.example, .gitignore, portable run.sh)

## 2026-05-01 — copilot
- (INGEST) **initial wiki bootstrap** — scanned the entire codebase (server.py, app.js, index.html, styles.css, requirements.txt, run.sh)
- Created schema.md, index.md, log.md
- Created pages: project-overview, tech-stack, business-logic, rag-pipeline, database-schema, storage-layout, api-routes, ui-pages, libraries, auth-rbac, deployment, gemini-integration, conventions
- Added sync.sh (LINT), wiki-server.py on port 7070, graph.html
- Added .github/copilot-instructions.md so AI agents auto-load the wiki

## 2026-05-01 — copilot
- (INGEST) **auth-rbac.md**: replaced 'no auth' with cookie session isolation model (owner field, _visible_docs, search filter, 403 on delete)
- (INGEST) **api-routes.md**: added /api/session, /api/session/reset, /api/download/source, /about


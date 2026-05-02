---
title: Wiki Index — AI Chat Demo v2
tags: [meta, overview, index]
related: [schema.md, log.md]
updated: 2026-05-01
---

# 📚 LLM Wiki — AI Chat Demo v2

> **Persistent project knowledge for AI agents.**
> Following [Karpathy's LLM Wiki pattern](https://medium.com/@tahirbalarabe2/what-is-llm-wiki-pattern-persistent-knowledge-with-llm-wikis-3227f561abc1) — 3 layers (Index / Pages / Log), 3 operations (INGEST / QUERY / LINT).

## 🚀 Quick Start for AI Agents

1. **Always read [project-overview](pages/project-overview.md) first** to understand what this app is
2. For task-specific work, jump to the relevant page below
3. After making code changes → run `bash .wiki/sync.sh` → if drift found, update wiki + append [log.md](log.md)
4. View the wiki visually: `python .wiki/wiki-server.py` → http://localhost:7070

## 🗂️ Pages

### 🧭 Foundation
- [project-overview](pages/project-overview.md) — What this app does, who uses it
- [tech-stack](pages/tech-stack.md) — Languages, frameworks, services
- [conventions](pages/conventions.md) — Code style, naming, patterns

### 🏛️ Architecture
- [business-logic](pages/business-logic.md) — RAG pipeline (Extract → Chunk → Enrich → Embed → Search → Answer)
- [rag-pipeline](pages/rag-pipeline.md) — Level 4 RAG: agentic, multi-query, rerank, reflect
- [database-schema](pages/database-schema.md) — SQLite (chunks) + FAISS index + JSON metadata
- [storage-layout](pages/storage-layout.md) — `uploads/` directory layout, cache files

### 🔌 Interfaces
- [api-routes](pages/api-routes.md) — All Flask endpoints
- [ui-pages](pages/ui-pages.md) — Single-page UI (`index.html` + `app.js`)

### 🔧 Operations
- [libraries](pages/libraries.md) — `requirements.txt` + CDN libs
- [auth-rbac](pages/auth-rbac.md) — Auth model (currently none)
- [deployment](pages/deployment.md) — gunicorn / dev server / env vars
- [gemini-integration](pages/gemini-integration.md) — API keys, rotation, rate limits, models

## 🧭 Quick Reference

| Need | Page |
|------|------|
| Add a new endpoint | [api-routes](pages/api-routes.md) → also update [ui-pages](pages/ui-pages.md) if UI calls it |
| Change DB schema | [database-schema](pages/database-schema.md) |
| Add new file type for upload | [business-logic](pages/business-logic.md) §Extract |
| Tune RAG quality | [rag-pipeline](pages/rag-pipeline.md) |
| Switch LLM provider | [gemini-integration](pages/gemini-integration.md) |
| Deploy to prod | [deployment](pages/deployment.md) |

## 📜 Operations

| Op | Command |
|----|---------|
| **LINT** (drift check) | `bash .wiki/sync.sh` |
| **VIEW** (web UI) | `python .wiki/wiki-server.py` → http://localhost:7070 |
| **GRAPH** (relationships) | http://localhost:7070/graph |

See [schema.md](schema.md) for the full conventions, [log.md](log.md) for change history.

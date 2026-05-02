---
title: Project Overview
tags: [overview, architecture, rag]
related: [tech-stack.md, business-logic.md, rag-pipeline.md]
updated: 2026-05-01
---

# 🤖 AI Chat Demo v2 — Project Overview

## 🎯 Purpose

A Thai-language **document-grounded chat assistant** powered by **Advanced RAG** (Retrieval-Augmented Generation). Users upload documents (PDF / Word / Excel / TXT), the server extracts → chunks → enriches → embeds → indexes the content. Queries trigger an **agentic Level-4 RAG pipeline** that answers with citations.

## 🧑‍💻 Who Uses It

- **End users**: Thai office workers asking questions about uploaded reports/contracts/policies
- **Single-tenant** demo (no auth — see [auth-rbac](auth-rbac.md))

## 🧱 High-Level Architecture

```
                         ┌──────────────────────────────────┐
  Browser (index.html)   │  Flask server (server.py:5000)   │
  ──────────────         │  ──────────────────────────────  │
  • Upload zone   ─POST→ │  /api/upload                     │
  • Doc list      ─GET → │  /api/documents                  │
  • Chat box      ─POST→ │  /api/chat ─→ Level-4 RAG ─→ LLM │
  • Progress bar  ─poll→ │  /api/upload/progress/<id>       │
                         └────────────┬─────────────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                ▼                     ▼                     ▼
        SQLite (rag.db)        FAISS index         Gemini API (3 keys)
        chunks + meta          3072-dim vectors    OCR / Chat / Embed
        WAL mode               IndexFlatIP         Rotated, rate-limited
```

## 📍 Source Layout

| File | Lines | Role |
|------|------:|------|
| [server.py](../../server.py) | ~2688 | Flask app, RAG pipeline, storage |
| [app.js](../../app.js) | ~655 | Browser logic (upload, chat, polling) |
| [index.html](../../index.html) | ~146 | Single-page UI shell |
| [styles.css](../../styles.css) | ~351 | Theme, sidebar, chat layout |
| [requirements.txt](../../requirements.txt) | 8 | Python deps |
| [run.sh](../../run.sh) | ~17 | Production startup (gunicorn) |
| .env | — | API keys (gitignored) |
| `uploads/` | — | Uploaded files + cache + indexes |

## 🔑 Key Properties

- **Stateless requests, stateful server** — chunks/vectors/history live in process + on disk
- **Async pipeline** — upload returns immediately, processing runs in background thread
- **3 Gemini keys** rotated based on per-key RPM (see [gemini-integration](gemini-integration.md))
- **Hybrid retrieval** — FAISS vector search + keyword scoring + RRF fusion (see [rag-pipeline](rag-pipeline.md))

## ⚠️ Gotchas

- The whole `documents` list and `enriched_store` dict live **in memory** — restart reloads from `uploads/_metadata.json` + `_text_cache/*_enriched.json`
- `run.sh` historically pointed to `/home/moo/AI-Chat-Demo` (no `-2`) — make sure it points to the actual repo dir
- Single Flask process for in-memory state; gunicorn workers > 1 will have **inconsistent state** between workers (each worker holds its own `documents` list). Currently mitigated by SQLite + FAISS being shared on disk, but `documents` / `chat_history` / `upload_progress` are NOT shared.

## 🔗 Related

- [tech-stack](tech-stack.md) — what's used
- [business-logic](business-logic.md) — pipeline detail
- [deployment](deployment.md) — how to run

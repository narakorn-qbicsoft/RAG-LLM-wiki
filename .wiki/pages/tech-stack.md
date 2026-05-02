---
title: Tech Stack
tags: [tech, overview, python, flask, javascript]
related: [project-overview.md, libraries.md, deployment.md]
updated: 2026-05-01
---

# 🛠️ Tech Stack

## Backend (Python 3)

| Layer | Choice | Reason |
|-------|--------|--------|
| Web framework | **Flask 3** + **flask-cors** | Minimal, single-file server |
| WSGI server | **gunicorn** (gthread, 2 workers × 4 threads) | Used in [run.sh](../../run.sh) |
| Vector DB | **FAISS** `IndexFlatIP` (cosine via L2-normalize) | Local, fast, no external service |
| Relational | **SQLite** (WAL mode) | `chunks` table; see [database-schema](database-schema.md) |
| LLM | **Google Gemini 2.5 Flash** (content + chat + OCR) | Multi-key rotation |
| Embeddings | **gemini-embedding-001** (3072-dim) | Same provider |
| PDF text | **PyMuPDF** (`fitz`) + **PyPDF2** (best-of) | Resilience |
| PDF OCR | **Gemini Vision** (single-page parallel) | Scanned PDFs |
| Word | **python-docx** | Paragraphs + tables |
| Excel | **openpyxl** | All sheets |
| Image | **Pillow** | OCR pre-resize |

## Frontend (vanilla)

| Layer | Choice |
|-------|--------|
| Markup | Single `index.html` |
| Logic | Vanilla JS IIFE in `app.js` (no framework) |
| Style | Hand-written CSS (`styles.css`) |
| Markdown | **marked.js** via CDN (chat answers) |
| Syntax HL | **highlight.js** via CDN |
| Icons | **Font Awesome 6** via CDN |
| Fonts | Inter + Noto Sans Thai via Google Fonts |

## Process Model

- **Dev**: `python server.py` → Flask dev server :5000
- **Prod**: `bash run.sh` → gunicorn 2×4 threads :5000
- Background work uses `threading.Thread(daemon=True)` and `ThreadPoolExecutor`

## What's NOT used

- ❌ No Redis (despite ops sometimes editing `/etc/redis/redis.conf` for other apps)
- ❌ No frontend framework (no React/Vue/Svelte)
- ❌ No build step (no webpack/vite/npm scripts)
- ❌ No Docker / k8s in repo
- ❌ No DB migrations tool — schema created via `CREATE TABLE IF NOT EXISTS`

## 🔗 Related
- [libraries](libraries.md) — exact pinned versions
- [deployment](deployment.md) — runtime setup

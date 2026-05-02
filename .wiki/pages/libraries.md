---
title: Libraries & Dependencies
tags: [tech, libraries, deployment]
related: [tech-stack.md, deployment.md]
updated: 2026-05-01
---

# 📦 Libraries

## Python ([requirements.txt](../../requirements.txt))

| Package | Min version | Used for |
|---------|-------------|----------|
| `flask` | 3.0 | HTTP server |
| `flask-cors` | 4.0 | CORS for browser fetches |
| `PyPDF2` | 3.0 | PDF text extraction (fallback) |
| `python-docx` | 1.0 | DOCX paragraphs + tables |
| `openpyxl` | 3.1 | XLSX all-sheets read |
| `python-dotenv` | 1.0 | Load `.env` keys |
| `openai` | 1.0 | (optional) OpenAI fallback — currently unused in code paths |
| `google-generativeai` | 0.5 | Gemini SDK (chat + embeddings + OCR) |

## Implicit / not in requirements.txt (must be installed separately)

| Package | Used for |
|---------|----------|
| `gunicorn` | Production WSGI ([run.sh](../../run.sh)) |
| `numpy` | Vector math |
| `faiss-cpu` (or `faiss-gpu`) | Vector index — `import faiss` |
| `PyMuPDF` | `import fitz` — primary PDF text + image extraction |
| `Pillow` | `from PIL import Image` — OCR pre-resize |
| `requests` | `import requests as http_req` — direct Gemini REST calls |

> 🚨 **Drift risk**: these are required at runtime but not declared. Consider adding to requirements.txt.

## Frontend (CDN, no package.json)

| Library | Version | Use |
|---------|---------|-----|
| Inter + Noto Sans Thai | Google Fonts | Typography |
| Font Awesome | 6.5.1 | Icons |
| highlight.js | 11.9.0 | Code syntax highlighting in chat |
| marked.js | 12.0.1 | Markdown render in chat answers |

All loaded from `cdnjs.cloudflare.com` in [index.html](../../index.html).

## ⚠️ Gotchas

- `openai` is in requirements.txt but **not imported** in current `server.py` — kept for future fallback
- Missing implicit deps will silently break OCR / FAISS / requests-based Gemini calls

## 🔗 Related
- [tech-stack](tech-stack.md)
- [deployment](deployment.md)

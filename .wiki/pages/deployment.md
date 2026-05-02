---
title: Deployment
tags: [deployment, ops, config]
related: [tech-stack.md, libraries.md, gemini-integration.md, auth-rbac.md]
updated: 2026-05-01
---

# 🚀 Deployment

## 🏃 Modes

### Dev
```bash
python server.py        # Flask dev server, reloader off, port 5000
```

### Production
```bash
bash run.sh             # gunicorn, 2 workers × 4 threads, port 5000
```

[run.sh](../../run.sh) flags:
- `--bind 0.0.0.0:5000`
- `--workers 2 --threads 4`
- `--timeout 120 --graceful-timeout 30`
- `--keep-alive 5 --max-requests 1000 --max-requests-jitter 50`
- access + error logs to stdout/stderr

> ⚠️ `cd` line in `run.sh` **must point to the actual repo dir** (e.g. `/home/moo/AI-Chat-Demo-2`).
> Historical bug: it used `/home/moo/AI-Chat-Demo` (no `-2`) which loaded the wrong code+`.env`.

## 🔌 Port

- Configurable via env: `PORT=5050 python server.py` (dev only — `run.sh` hardcodes 5000)
- Default: **5000**

## 🔑 Environment Variables (`.env`)

Loaded via `python-dotenv` at top of `server.py`:

| Var | Required? | Used for |
|-----|-----------|----------|
| `GEMINI_API_KEY` | ✅ at least one | Primary Gemini key |
| `GEMINI_API_KEY_2` | optional | 2nd key for rotation |
| `GEMINI_API_KEY_3` | optional | 3rd key for rotation |
| `GEMINI_API_KEY_4` | optional | 4th key for rotation |
| `GEMINI_API_KEY_5` | optional | 5th key — see [gemini-integration](gemini-integration.md) |
| `OPENAI_API_KEY` | unused | Listed but no code path uses it currently |
| `DEEPSEEK_API_KEY` | unused | Same |
| `PORT` | optional | Override Flask listening port (dev only) |

> Keys are exported into the gunicorn process by `run.sh`:
> `export $(grep -v '^#' .env | xargs)`

## 🧱 System Requirements

- Python 3.10+
- ~1 GB RAM minimum (FAISS + embeddings)
- Disk: depends on uploaded corpus; FAISS file ≈ `4 bytes × 3072 dim × N chunks`
- Outbound HTTPS to `generativelanguage.googleapis.com`

## 📦 Install

```bash
pip install -r requirements.txt
pip install gunicorn faiss-cpu numpy PyMuPDF Pillow requests   # implicit deps
```
> See [libraries](libraries.md) for the full list incl. those missing from requirements.txt.

## 🔄 Restart Procedure

```bash
sudo pkill -f 'gunicorn.*server:app'
sleep 2
sudo nohup bash run.sh > /tmp/aichat.log 2>&1 &
```
Verify:
```bash
ss -ltnp | grep 5000
curl -s http://127.0.0.1:5000/api/stats | jq
```

## 🛡️ Production Hardening

- Currently **no auth** — see [auth-rbac](auth-rbac.md). Must put behind reverse-proxy auth (nginx + basic-auth / Cloudflare Access / etc.)
- Multiple gunicorn workers split the in-memory state — currently safe-ish because state is rebuilt from disk on read paths, but `chat_history`, `upload_progress` and `documents` list will be inconsistent across workers. Consider `--workers 1` if that matters.

## 🔗 Related
- [gemini-integration](gemini-integration.md)
- [auth-rbac](auth-rbac.md)
- [tech-stack](tech-stack.md)


## 📦 Distribution (BYOK install, added 2026-05-01)

For end-users who **clone & install themselves**:

- [.env.example](../../.env.example) — template with empty `GEMINI_API_KEY` slots
- [setup.sh](../../setup.sh) / [setup.bat](../../setup.bat) — one-shot installer (creates venv, installs deps, copies .env)
- [README.md](../../README.md) — full TH/EN install + usage guide
- [LICENSE](../../LICENSE) — MIT
- [.gitignore](../../.gitignore) — protects `.env`, `uploads/`, `*.bak_*`, `__pycache__`

`run.sh` is now **portable** — it `cd`s to its own dir via `readlink -f`, sources `.env` and an optional `.venv/`, and accepts `PORT` / `WORKERS` / `THREADS` env overrides.

End-users do not get shipped any keys — they paste their own via the **⚙ Settings** modal in the UI (which calls `POST /api/config/keys`, see [api-routes](api-routes.md)). Saved to `.env` with `chmod 600`.


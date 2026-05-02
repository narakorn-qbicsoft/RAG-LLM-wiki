#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
#  AI Chat Demo — One-shot installer (Linux / macOS)
# ════════════════════════════════════════════════════════════════
set -e

cd "$(dirname "$0")"

echo "🐍 [1/4] Checking Python..."
PY=python3
if ! command -v $PY >/dev/null; then
  echo "❌ python3 not found. Install Python 3.10+ first."
  exit 1
fi
$PY --version

echo "📦 [2/4] Creating virtual environment..."
if [ ! -d ".venv" ]; then
  $PY -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip

echo "📚 [3/4] Installing dependencies..."
pip install -r requirements.txt
# Implicit deps not always pinned in requirements.txt:
pip install gunicorn faiss-cpu numpy PyMuPDF Pillow requests

echo "🔑 [4/4] Preparing .env..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  chmod 600 .env
  echo "   → Created .env (empty). You can fill in keys via the web UI later."
fi

mkdir -p uploads

cat <<MSG

✅ Setup complete!

Next steps:
   source .venv/bin/activate
   python server.py            # dev mode, http://localhost:5000
   # or, for production:
   bash run.sh                 # gunicorn, 2 workers

Then open http://localhost:5000 — the app will guide you through entering
your Google Gemini API key (free tier: https://aistudio.google.com/apikey).

MSG

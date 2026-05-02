#!/bin/bash
# AI Chat Demo — Production Startup Script (gunicorn)
# Portable: uses the script's own directory, not a hardcoded path.

set -e
cd "$(dirname "$(readlink -f "$0")")"

# Load .env if present (skip comments/blanks)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1090
  . <(grep -v '^\s*#' .env | grep -v '^\s*$')
  set +a
fi

# Activate venv if it exists
if [ -d ".venv" ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

PORT="${PORT:-5000}"

exec gunicorn \
    --bind "0.0.0.0:${PORT}" \
    --workers "${WORKERS:-2}" \
    --threads "${THREADS:-4}" \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    server:app

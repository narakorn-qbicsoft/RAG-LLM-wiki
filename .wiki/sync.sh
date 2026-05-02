#!/usr/bin/env bash
# .wiki/sync.sh — Drift detector for the AI Chat Demo v2 LLM Wiki.
# Compares the wiki claims against the actual codebase. Exit 0 = no drift.
#
# Usage:
#   bash .wiki/sync.sh            # report drift
#   bash .wiki/sync.sh --strict   # exit non-zero on drift (CI mode)
#
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI="$ROOT/.wiki"
PAGES="$WIKI/pages"
STRICT=0
[[ "${1:-}" == "--strict" ]] && STRICT=1

drift=0
note() { printf "  • %s\n" "$1"; }
sec()  { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad()  { printf "  \033[31m✗\033[0m %s\n" "$1"; drift=$((drift+1)); }

# --- 1. Routes declared in api-routes.md vs actual @app.route in server.py ---
sec "API routes"
declared=$(grep -oE '/api/[a-zA-Z_/<>:-]+' "$PAGES/api-routes.md" | sort -u)
actual=$(grep -oE "@app\.route\(['\"][^'\"]+['\"]" "$ROOT/server.py" | grep -oE "/api/[^'\"]+" | sort -u)
for r in $actual; do
  echo "$declared" | grep -qF "$r" && ok "found in wiki: $r" || bad "missing from api-routes.md: $r"
done

# --- 2. SQLite tables declared in database-schema.md ---
sec "SQLite tables"
declared_tbl=$(grep -oE '`[a-z_]+`' "$PAGES/database-schema.md" | tr -d '`' | sort -u)
actual_tbl=$(grep -oE 'CREATE TABLE IF NOT EXISTS [a-z_]+' "$ROOT/server.py" | awk '{print $NF}' | sort -u)
for t in $actual_tbl; do
  echo "$declared_tbl" | grep -qx "$t" && ok "table documented: $t" || bad "table missing from database-schema.md: $t"
done

# --- 3. Python packages in requirements.txt vs libraries.md ---
sec "Python packages"
declared_pkg=$(grep -oE '`[a-zA-Z0-9_-]+`' "$PAGES/libraries.md" | tr -d '`' | tr '[:upper:]' '[:lower:]' | sort -u)
for p in $(awk -F'[>=<]' '/^[a-zA-Z]/{print tolower($1)}' "$ROOT/requirements.txt"); do
  echo "$declared_pkg" | grep -qx "$p" && ok "package documented: $p" || bad "requirements.txt has $p but libraries.md doesn't list it"
done

# --- 4. HTML element ids referenced in ui-pages.md vs index.html ---
sec "HTML element ids"
declared_id=$(grep -oE '`[a-zA-Z][a-zA-Z0-9]+`' "$PAGES/ui-pages.md" | tr -d '`' | sort -u)
for id in $(grep -oE 'id="[a-zA-Z][a-zA-Z0-9]+"' "$ROOT/index.html" | sed 's/id="//;s/"//' | sort -u); do
  echo "$declared_id" | grep -qx "$id" && ok "id documented: $id" || bad "index.html id missing from ui-pages.md: $id"
done

# --- 5. Key Python functions referenced in rag-pipeline.md exist in server.py ---
sec "RAG pipeline functions"
for fn in _level4_pipeline _agent_classify _rewrite_query _multi_query_search search_docs _ai_rerank _compress_context ai_respond _agent_reflect _agent_decompose_search _agent_refine_answer; do
  grep -qE "^def[[:space:]]+${fn}\b" "$ROOT/server.py" && ok "fn exists: $fn" || bad "rag-pipeline.md mentions $fn but it isn't in server.py"
done

# --- 6. Gemini env vars in deployment.md vs server.py ---
sec "Env vars"
for v in GEMINI_API_KEY GEMINI_API_KEY_2 GEMINI_API_KEY_3 GEMINI_API_KEY_4 GEMINI_API_KEY_5; do
  grep -qF "$v" "$PAGES/deployment.md" && ok "env documented: $v" || bad "server.py reads $v but deployment.md doesn't mention it"
done

# --- 7. All page files have YAML frontmatter ---
sec "Frontmatter integrity"
for p in "$PAGES"/*.md; do
  head -1 "$p" | grep -q '^---$' && ok "frontmatter ok: $(basename "$p")" || bad "missing frontmatter: $(basename "$p")"
done

# --- 8. Every page is linked from index.md ---
sec "Index linkage"
for p in "$PAGES"/*.md; do
  base=$(basename "$p")
  grep -qF "pages/$base" "$WIKI/index.md" && ok "indexed: $base" || bad "not in index.md: $base"
done

# --- summary ---
sec "Summary"
if [[ $drift -eq 0 ]]; then
  printf "\033[32m✓ 0 drift items — wiki is in sync with code.\033[0m\n"
  exit 0
else
  printf "\033[31m✗ %d drift item(s).\033[0m  Run an INGEST pass to update the wiki.\n" "$drift"
  [[ $STRICT -eq 1 ]] && exit 1 || exit 0
fi

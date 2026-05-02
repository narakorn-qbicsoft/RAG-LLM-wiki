---
title: Wiki Schema & Conventions
tags: [meta, schema, conventions]
related: [index.md, log.md]
updated: 2026-05-01
---

# 📐 Wiki Schema

This file defines **how to write pages** in this LLM Wiki, following **Andrej Karpathy's LLM Wiki pattern** (3 layers, 3 operations).

## 🧱 3 Layers

| Layer | Folder | Purpose |
|-------|--------|---------|
| **Index** | `index.md` | Single source of truth — links to every page |
| **Pages** | `pages/*.md` | Domain knowledge: one topic per file |
| **Log** | `log.md` | Append-only changelog of wiki edits |

## ⚙️ 3 Operations

| Op | Trigger | Action |
|----|---------|--------|
| **INGEST** | New code added | Scan source → write/update relevant `pages/*.md` + append to `log.md` |
| **QUERY** | AI agent answering question | Read `index.md` → follow links → cite page in answer |
| **LINT** | Pre-commit / on-demand | Run `sync.sh` → detect code↔wiki drift → exit non-zero if drift found |

## 📝 Page Format

Every page in `pages/` **MUST** start with frontmatter:

```yaml
---
title: Human-readable title
tags: [tag1, tag2, tag3]
related: [other-page.md, another.md]
updated: YYYY-MM-DD
---
```

Then markdown body with these recommended sections:

1. **🎯 Purpose** — one-sentence what & why
2. **📍 Source** — file paths + line numbers (linkable)
3. **🔑 Key Concepts** — bullets / table
4. **🧪 Examples** — request/response / sample code
5. **⚠️ Gotchas** — known issues, drift risks
6. **🔗 Related** — links to other pages

## 🏷️ Tag Vocabulary

Use only these tags (extend with care; record additions in [log.md](log.md)):

- **Architecture**: `architecture`, `pipeline`, `rag`, `storage`
- **Tech**: `python`, `flask`, `javascript`, `html`, `css`, `sqlite`, `faiss`, `gemini`
- **Concern**: `api`, `ui`, `auth`, `database`, `deployment`, `config`, `ops`
- **Domain**: `upload`, `chat`, `search`, `embedding`, `ocr`, `enrichment`
- **Meta**: `meta`, `schema`, `conventions`, `overview`

## 🔗 Linking Rules

- Always use **relative links**: `[api-routes](api-routes.md)`
- For source citations use repo-relative path with optional `#Lxxx`:
  `See [server.py L2099](../../server.py#L2099)`
- Each page **MUST** appear in [index.md](index.md) under at least one section
- Each page **MUST** list `related:` of at least 1 sibling (forms the graph edges)

## 🚦 Drift Rules (enforced by `sync.sh`)

A new artifact in code is considered **drift** if it doesn't appear in any wiki page text:

| Artifact | Detection | Owner page |
|----------|-----------|------------|
| Flask route `@app.route('...')` | grep server.py | [api-routes.md](pages/api-routes.md) |
| SQLite `CREATE TABLE` | grep server.py | [database-schema.md](pages/database-schema.md) |
| HTML `id="..."` of major element | grep index.html | [ui-pages.md](pages/ui-pages.md) |
| New top-level function `def _xxx` (non-`_helper`) | grep server.py | [business-logic.md](pages/business-logic.md) |
| New entry in `requirements.txt` | parse file | [libraries.md](pages/libraries.md) |
| New env var `os.environ.get('XXX')` | grep server.py | [deployment.md](pages/deployment.md) |

When `sync.sh` reports drift, run **INGEST** to update the relevant page, then `log.md`.

## ✍️ Writing Style

- **Concise** — bullets > prose
- **Cite source** — every claim must reference a file/line
- **Bilingual ok** — TH for product/UX, EN for tech identifiers
- **No marketing fluff** — pages are for AI agents

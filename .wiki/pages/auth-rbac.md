---
title: Auth & Session Isolation
tags: [auth, conventions, api]
related: [api-routes.md, deployment.md, project-overview.md]
updated: 2026-05-01
---

# 🔒 Auth & Session Isolation

## 🎯 Purpose

Per-browser document isolation — each visitor sees only their own uploads. No login required (demo-friendly).

## 📍 Source

- [server.py L460+](../../server.py) — `_attach_session`, `_persist_session`, `_can_see`, `_visible_docs`, `_visible_doc_ids`
- Cookie name: `aichat_sid` (32-char hex, HttpOnly, SameSite=Lax, 1-year max-age)

## 🔑 Key Concepts

| Concept | How |
|---|---|
| Session id | `secrets.token_hex(16)` set on first request |
| Owner field | Each `documents[i]['owner']` = sid (or `'public'` for legacy) |
| Visibility | `_visible_docs()` returns docs where `owner == sid` OR `owner == 'public'` |
| Search filter | `search_docs(..., allowed_doc_ids=set)` restricts FAISS + SQLite candidates |
| Delete | 403 if doc owner ≠ current sid (cannot delete others' or public docs) |
| Wiki | `/api/wiki/index` filters docs; `/api/wiki/<id>` 403 if not visible |

## 🧪 Endpoints

- `GET /api/session` → `{sessionId, fullSessionId, myDocs, publicDocs, totalVisible}`
- `POST /api/session/reset` → issues new sid (forgets all current uploads)
- All other endpoints automatically filter by `g.sid` via the before/after hooks

## ⚠️ Gotchas

- **No real auth** — anyone with the cookie value can impersonate. For prod, add OAuth + reverse-proxy.
- **Public docs** — pre-existing docs (without `owner` in metadata.json) default to `public` and visible to everyone, but **not deletable** by non-owners.
- **FAISS isolation is post-hoc** — vectors aren't physically partitioned; we filter by `doc_id` after retrieval. Performance is fine for thousands of docs.
- **chat_history is global** — currently shared across all sessions; consider per-session if needed.

## 🔗 Related

- [api-routes](api-routes.md) — full route list including `/api/session`, `/api/session/reset`
- [deployment](deployment.md) — production hardening

---
title: UI Pages & Components
tags: [ui, html, javascript, css]
related: [api-routes.md, conventions.md]
updated: 2026-05-01
---

# 🖼️ UI

Single-page app — one HTML file, one JS file, one CSS file, no framework.

## 📄 [index.html](../../index.html)

Layout (top-down):

| Region | id | Purpose |
|--------|----|---------|
| Sidebar | `sidebar` | Logo, upload zone, doc list, stats, clear-chat |
| Upload zone | `uploadZone` + `fileInput` | Drag-drop / click-to-pick |
| Upload progress | `uploadProgress` (+ `progressFill`, `progressLabel`, `progressPct`, `progressEta`, `pipelineSteps`) | Per-step status while pipeline runs |
| Doc list | `docList` (+ count `docCount`) | Cards per uploaded doc, click → preview, × → delete |
| Stats panel | `statsSection` (+ `statDocs`, `statWords`, `statChunks`, `statAI`) | Live counters |
| Chat header | `headerStatus` | Status dot + text |
| Welcome screen | `welcomeScreen` | Shown until first message; suggestion buttons |
| Chat messages | `chatMessages` | User/AI bubbles, markdown-rendered |
| Chat input | `chatInput` + `btnSend` | Auto-resize textarea + send button |
| Quick actions | `quickActions` | Quick-question chips |
| Modals | `previewModal` (+ `previewBody`, `previewClose`, `previewTitle`) | Document text preview |
| Toasts | `toastContainer` | Transient notifications |
| Buttons | `btnMenu`, `btnNewChat`, `btnClearChat`, `btnSend`, `sidebarClose` | Misc UI controls |
| App root | `app` | Top-level wrapper |

## 🧩 [app.js](../../app.js)

Single IIFE; sections (search for `// ═══`):

| Section | Lines | Functions |
|---------|------:|-----------|
| Init | ~45 | `init`, `autoResize` |
| Sidebar | ~60 | `setupSidebar`, `toggleSidebar` |
| Upload | ~100 | `setupUpload`, `uploadFile` (XHR+progress), `pollProgress` |
| Documents | ~285 | `loadDocuments`, `renderDocs`, `previewDoc`, `reprocessDoc`, `deleteDoc` |
| Stats | ~320 | `loadStats` |
| Chat | ~380 | `setupChat`, `sendMessage`, `appendMessage`, `renderMarkdown` |
| Modal | ~545 | `setupModal` |
| Toast | end | `toast(msg, type)` |

### Endpoints called

| Endpoint | Where (app.js line) |
|----------|---------------------|
| `POST /api/upload` | 149 (XHR with progress) |
| `GET /api/upload/progress/<id>` | 244 (poll loop) |
| `GET /api/documents` | 290 |
| `GET /api/stats` | 324 |
| `POST /api/chat` | 405 |
| `POST /api/chat/clear` | 529, 540 |
| `GET /api/documents/<id>/preview` | 550 |
| `POST /api/reprocess/<id>` | 564 |
| `DELETE /api/documents/<id>` | 586 |

## 🎨 [styles.css](../../styles.css)

- Custom property–based theme (search `:root`)
- Dark sidebar, light chat area
- Mobile: sidebar slides over with overlay
- Pipeline step states: `.pending` / `.active` / `.done` / `.error`

## ⚠️ Gotchas

- `chatInput` posts to `/api/chat` with key **`question`** — not `message`
- The poll loop is timed in `app.js` and computes ETA; very long OCR jobs may show inflated ETA early on
- All elements are accessed by hard-coded `#id` — adding new components requires matching `id` and a JS handler
- No SPA routing — refresh = state reset (chat history is server-side though)

## 🔗 Related
- [api-routes](api-routes.md) — what each fetch hits
- [conventions](conventions.md) — naming patterns


## ⚙️ Setup / API Key UI (added 2026-05-01)

New DOM elements in [index.html](../../index.html):

| id | Purpose |
|----|---------|
| `btnSettings` | Gear icon in chat header — opens setup modal |
| `setupModal` | Modal containing API key form |
| `setupForm` | `<form>` with 5 password inputs (`GEMINI_API_KEY`, `_2`..`_5`) |
| `firstRunOverlay` | Blocking welcome screen shown when no keys configured |
| `firstRunBtn` | "Open Setup" button on the welcome overlay |
| `setupClose` | × button on the setup modal |
| `setupBody` | Inner scrollable container of the setup modal |
| `setupEnvPath` | Displays absolute path to `.env` |

`app.js` additions: `setupConfigUI()`, `checkConfig()`, `loadConfigIntoForm()`, `openSetup()`, `closeSetup()`. Per-row Test buttons hit `/api/config/test`; submit hits `/api/config/keys` then re-runs `loadStats()`.

CSS additions in [styles.css](../../styles.css): `.setup-modal`, `.setup-row`, `.setup-input`, `.btn-eye`, `.btn-test`, `.btn-save`, `.firstrun-overlay`, `.firstrun-card`.

## 📚 Document Wiki UI

Triggered from the chat header button `btnWiki` (📖 book icon, next to Settings). Opens fullscreen modal `wikiModal`.

| Element id | Purpose |
|------------|---------|
| `btnWiki` | Header button to open the wiki modal |
| `wikiModal` | Modal overlay container |
| `wikiBody` | Main content pane (renders index OR per-doc page) |
| `wikiSubtitle` | Header subtitle (shows doc name when viewing a page) |
| `wikiBack` | Back-to-index button (only visible in doc view) |
| `wikiRebuildAll` | Rebuild all wikis button (header) |
| `wikiClose` | Close-modal button |

**Two views:**
1. **Index view** — tag cloud (clickable to filter), entity list, doc cards grid
2. **Doc view** — full wiki page: summary, tags, entities, key points, sections, suggested questions (clickable → fills `chatInput` and closes modal)

Data fetched from `/api/wiki/index` and `/api/wiki/<doc_id>` (see [api-routes](api-routes.md)).


## 🆕 Header (added 2026-05-01)

| Element | id | Action |
|---|---|---|
| About link | `btnAbout` | Opens `/about` (install/usage page) in new tab |
| Session badge | `sessionBadge` | Shows `🔒 Session <sid8> · N your docs · M public` populated from `/api/session` |

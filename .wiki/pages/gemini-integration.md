---
title: Gemini Integration
tags: [gemini, api, config, ops]
related: [rag-pipeline.md, business-logic.md, deployment.md]
updated: 2026-05-01
---

# 🔑 Gemini Integration

## 🎛️ Models in use (server.py:48-51)

| Constant | Value | Where |
|----------|-------|-------|
| `GEMINI_CONTENT_MODEL` | `gemini-2.5-flash` | Enrichment, query rewrite, rerank, agent ops |
| `GEMINI_CHAT_MODEL` | `gemini-2.5-flash` | Final chat answer (`ai_respond`) |
| `GEMINI_OCR_MODEL` | `gemini-2.5-flash` | Vision OCR for scanned PDFs |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` | Doc + query embeddings (3072-dim) |

## 🔁 Multi-Key Rotation

Keys collected from env at startup (server.py:60-64):
```
GEMINI_KEYS = [GEMINI_API_KEY, GEMINI_API_KEY_2, ..., _5]  # only non-empty
```

Per-key state in `key_usage` dict:
```python
{api_key: {"calls": [timestamps...], "cooldown_until": float}}
```

### Selection (`_get_best_key`, server.py:73)

1. Skip keys whose `cooldown_until` is in the future
2. Drop call timestamps older than 60s
3. Return key with **lowest recent call count** that's under the RPM limit

### Limits

| Constant | Value | Meaning |
|----------|-------|---------|
| `RPM_CONTENT` | 25 | Per-key cap for chat/enrich/rerank |
| `RPM_EMBED` | 1400 | Per-key cap for embeddings |
| `COOLDOWN_SECONDS` | 2 | Set when 429 is received |

### Wrappers

| Function | Purpose |
|----------|---------|
| `_gemini_call(prompt, is_embed, max_retries=5, model_name=None)` | Generic call w/ retry & rotation |
| `_batch_embed_gemini(texts, task_type, batch_size=100, ...)` | Embedding batches |
| `_embed_query(text)` | Single query embedding (`RETRIEVAL_QUERY`) |
| `_mark_key_used(key)` / `_mark_key_cooldown(key)` | State updates |

## 🌐 Network style

- **SDK** (`google.generativeai`) for: simple text gen + embeddings
- **Direct REST** (`requests.post`) for: OCR (multimodal payload) + parallel enrichment batches (manual key rotation per attempt)

## 🛟 Failure Modes

| Symptom | Cause | Mitigation |
|---------|-------|------------|
| `All Gemini API keys exhausted or rate limited` | All keys on cooldown or above RPM | Wait 60s; pipeline falls back to no-enrich |
| HTTP 429 | Per-key minute quota | Cooldown 2s, rotate to next key |
| `RECITATION` finishReason | Gemini refused (copyright safety) | OCR page is skipped |
| Hallucinated OCR (>8000 chars or >20% garbage) | Gemini Vision overproduces | Page retried up to 3× |

## 🧪 Verifying

```bash
curl -s http://127.0.0.1:5000/api/stats | jq '{hasGemini, geminiKeys}'
# expect: {"hasGemini": true, "geminiKeys": 3}
```

## ⚠️ Gotchas

- Adding a 6th key requires editing the loop at server.py:60 (currently hardcoded `_2..._5`)
- `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` are loaded but no code path uses them
- Embeddings are 3072-dim — changing the model means rebuilding the FAISS index (`EMBED_DIM` mismatch will crash)

## 🔗 Related
- [rag-pipeline](rag-pipeline.md)
- [business-logic](business-logic.md)
- [deployment](deployment.md)

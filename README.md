# 🤖 AI Chat Demo — RAG + Wiki

Q&A web app that reads YOUR documents (PDF/Word/Excel/Image) and answers with AI.

## ⚡ Quick Start

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit GEMINI_API_KEY
python3 server.py
```

Open http://localhost:5000 and **read the full guide at [/about](http://localhost:5000/about)**.

## 🌟 Features

- 📄 Upload PDF / DOCX / XLSX / TXT / PNG / JPG (with OCR + Vision)
- 💬 Level-4 RAG chat (agentic, multi-query, hybrid search, AI rerank, reflect)
- 📖 Auto Wiki — generated knowledge page per document
- 🧠 Hybrid mode — falls back to general AI knowledge when doc has no answer
- 🔒 Session-isolated — each browser sees only its own uploads
- 🔑 BYOK — bring your own Gemini API keys via UI or .env
- 🇹🇭 Thai + English support

## 🏗️ Tech Stack

- **Backend**: Python 3.10+ / Flask / gunicorn
- **Storage**: SQLite + FAISS (3072-dim vectors)
- **LLM**: Gemini 2.5 Flash + gemini-embedding-001
- **Frontend**: Vanilla JS (no build step), CDN libraries

## 📚 Documentation

Browse the auto-generated project wiki:
```bash
python3 .wiki/wiki-server.py    # http://localhost:7070
```

## 📦 Get the Code

Visit `/about` on a running instance to download a zip, or clone via git.

## ⚖️ License

Open source for non-commercial use.

#!/usr/bin/env python3
"""Patch server.py for accuracy improvements."""

with open('server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Model configs
content = content.replace(
    "GEMINI_CHAT_MODEL = 'gemini-2.5-flash-lite'  # Fast model for chat responses",
    "GEMINI_CHAT_MODEL = 'gemini-2.5-flash'  # Full model for accurate chat"
)
print("1. Chat model -> flash")

content = content.replace(
    "GEMINI_OCR_MODEL = 'gemini-2.5-flash-lite'  # Fast + supports vision",
    "GEMINI_OCR_MODEL = 'gemini-2.5-flash'  # Full model for Vision OCR fallback"
)
print("2. OCR model -> flash")

content = content.replace(
    "SKIP_ENRICHMENT = True  # Skip AI enrichment for speed — just embed raw text",
    "SKIP_ENRICHMENT = False  # Enable enrichment for better search quality"
)
print("3. Enrichment enabled")

# 2. Chunk size  
content = content.replace(
    "def chunk_text(text, size=1500, overlap=150):",
    "def chunk_text(text, size=800, overlap=100):"
)
print("4. Chunk size 1500->800")

with open('server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done with simple replacements")

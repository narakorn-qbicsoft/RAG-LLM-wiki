#!/usr/bin/env python3
"""
.wiki/wiki-server.py — Tiny HTTP viewer for the LLM Wiki.

Routes:
  GET /                  → list of pages with tag filters
  GET /view/<file.md>    → rendered markdown
  GET /graph             → D3 force-directed graph
  GET /graph.json        → graph data (nodes + links from `related:`)
  GET /sync              → run sync.sh and show output

Run:  python3 .wiki/wiki-server.py        # listens on :7070
"""
import http.server, socketserver, json, os, re, subprocess, urllib.parse, html

PORT = int(os.environ.get("WIKI_PORT", "7070"))
HERE = os.path.dirname(os.path.abspath(__file__))
PAGES_DIR = os.path.join(HERE, "pages")

# --- minimal markdown → HTML ---------------------------------------------------
def md_to_html(text: str) -> str:
    # strip frontmatter
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            text = text[end+4:].lstrip("\n")
    out, in_code, in_table = [], False, False
    for raw in text.split("\n"):
        line = raw.rstrip()
        if line.startswith("```"):
            if in_code: out.append("</code></pre>"); in_code = False
            else: lang = line[3:].strip(); out.append(f'<pre class="lang-{html.escape(lang)}"><code>'); in_code = True
            continue
        if in_code:
            out.append(html.escape(raw)); continue
        if line.startswith("|") and "|" in line[1:]:
            cells = [c.strip() for c in line.strip("|").split("|")]
            if all(re.match(r'^:?-+:?$', c) for c in cells):
                continue
            tag = "th" if not in_table else "td"
            if not in_table: out.append("<table>"); in_table = True
            out.append("<tr>" + "".join(f"<{tag}>{inline(c)}</{tag}>" for c in cells) + "</tr>")
            continue
        elif in_table:
            out.append("</table>"); in_table = False
        if line.startswith("# "):   out.append(f"<h1>{inline(line[2:])}</h1>")
        elif line.startswith("## "):  out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("### "): out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("- "):   out.append(f"<li>{inline(line[2:])}</li>")
        elif re.match(r'^\d+\.\s', line): out.append(f"<li>{inline(re.sub(r'^\d+\.\s', '', line))}</li>")
        elif line.startswith("> "):   out.append(f"<blockquote>{inline(line[2:])}</blockquote>")
        elif line == "":             out.append("<p></p>")
        else:                         out.append(f"<p>{inline(line)}</p>")
    if in_code: out.append("</code></pre>")
    if in_table: out.append("</table>")
    # collapse <li> runs
    html_out = "\n".join(out)
    html_out = re.sub(r'(<li>.*?</li>\n?)+', lambda m: "<ul>"+m.group(0)+"</ul>", html_out, flags=re.S)
    return html_out

def inline(s: str) -> str:
    s = html.escape(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', lambda m: f'<a href="{rewrite_link(m.group(2))}">{m.group(1)}</a>', s)
    return s

def rewrite_link(href: str) -> str:
    if href.startswith("http"): return href
    if href.endswith(".md"):
        base = href.split("/")[-1]
        return f"/view/{base}"
    return href

# --- frontmatter parser --------------------------------------------------------
def parse_frontmatter(text: str) -> dict:
    if not text.startswith("---"): return {}
    end = text.find("\n---", 3)
    if end == -1: return {}
    meta, body = {}, text[3:end].strip()
    for line in body.split("\n"):
        if ":" not in line: continue
        k, _, v = line.partition(":")
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip() for x in v[1:-1].split(",") if x.strip()]
        meta[k.strip()] = v
    return meta

def all_pages():
    out = []
    for fn in sorted(os.listdir(PAGES_DIR)):
        if not fn.endswith(".md"): continue
        with open(os.path.join(PAGES_DIR, fn), encoding="utf-8") as f:
            txt = f.read()
        out.append({"file": fn, "meta": parse_frontmatter(txt)})
    return out

# --- HTML pages ----------------------------------------------------------------
SHELL = """<!doctype html><html><head><meta charset="utf-8"><title>{title}</title>
<style>
body{{font-family:-apple-system,Segoe UI,Inter,sans-serif;margin:0;background:#0f172a;color:#e2e8f0;}}
.wrap{{max-width:920px;margin:0 auto;padding:24px;}}
nav{{background:#1e293b;padding:12px 24px;border-bottom:1px solid #334155;}}
nav a{{color:#60a5fa;margin-right:16px;text-decoration:none;font-weight:600;}}
h1,h2,h3{{color:#f1f5f9;}}
a{{color:#60a5fa;}}
code{{background:#1e293b;padding:2px 6px;border-radius:4px;color:#fbbf24;font-size:.92em;}}
pre{{background:#0b1220;padding:14px;border-radius:8px;overflow:auto;border:1px solid #1e293b;}}
pre code{{background:none;color:#e2e8f0;padding:0;}}
table{{border-collapse:collapse;margin:12px 0;width:100%;}}
th,td{{border:1px solid #334155;padding:6px 10px;text-align:left;}}
th{{background:#1e293b;}}
blockquote{{border-left:4px solid #f59e0b;padding:8px 14px;background:#1e293b;color:#fcd34d;margin:12px 0;}}
.tag{{display:inline-block;background:#334155;color:#cbd5e1;padding:2px 8px;border-radius:10px;font-size:.78em;margin:0 4px 4px 0;}}
.card{{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:12px;}}
.card h3{{margin:0 0 6px 0;}}
</style></head><body>
<nav><a href="/">📚 Pages</a><a href="/graph">🕸️ Graph</a><a href="/sync">🔁 Sync</a></nav>
<div class="wrap">{body}</div></body></html>"""

def page_index() -> str:
    cards = []
    for p in all_pages():
        m = p["meta"]
        tags = "".join(f'<span class="tag">{html.escape(t)}</span>' for t in (m.get("tags") or []))
        cards.append(f'<div class="card"><h3><a href="/view/{p["file"]}">{html.escape(m.get("title", p["file"]))}</a></h3>{tags}<div style="color:#94a3b8;font-size:.85em;margin-top:6px;">updated: {html.escape(str(m.get("updated","?")))}</div></div>')
    return SHELL.format(title="LLM Wiki — Index", body="<h1>📚 LLM Wiki</h1>" + "".join(cards))

def page_view(fn: str) -> str:
    path = os.path.join(PAGES_DIR, fn)
    if not os.path.isfile(path): return SHELL.format(title="404", body="<h1>404</h1>")
    with open(path, encoding="utf-8") as f: txt = f.read()
    return SHELL.format(title=fn, body=md_to_html(txt))

def page_graph() -> str:
    with open(os.path.join(HERE, "graph.html"), encoding="utf-8") as f:
        return f.read()

def graph_json() -> dict:
    nodes, links = [], []
    for p in all_pages():
        m = p["meta"]
        tags = m.get("tags") or []
        nodes.append({"id": p["file"], "title": m.get("title", p["file"]), "tag": (tags[0] if tags else "other"), "tags": tags})
        for r in (m.get("related") or []):
            links.append({"source": p["file"], "target": r})
    return {"nodes": nodes, "links": links}

def page_sync() -> str:
    try:
        out = subprocess.run(["bash", os.path.join(HERE, "sync.sh")], capture_output=True, text=True, timeout=30)
        body = f"<h1>🔁 Sync</h1><pre>{html.escape(out.stdout + out.stderr)}</pre>"
    except Exception as e:
        body = f"<h1>error</h1><pre>{html.escape(str(e))}</pre>"
    return SHELL.format(title="Sync", body=body)

# --- HTTP handler --------------------------------------------------------------
class H(http.server.BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="text/html; charset=utf-8"):
        b = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/":              return self._send(200, page_index())
        if u.path.startswith("/view/"): return self._send(200, page_view(u.path[6:]))
        if u.path == "/graph":         return self._send(200, page_graph())
        if u.path == "/graph.json":    return self._send(200, json.dumps(graph_json()), "application/json")
        if u.path == "/sync":          return self._send(200, page_sync())
        self._send(404, "<h1>404</h1>")
    def log_message(self, *a, **kw): pass

if __name__ == "__main__":
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), H) as srv:
        print(f"📚 Wiki viewer on http://0.0.0.0:{PORT}", flush=True)
        srv.serve_forever()

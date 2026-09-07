#!/usr/bin/env python3
"""Serve the site so /events, /menu, and /hiring render as HTML (no .html in the URL)."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent / "site"
PRETTY = {
    "/index": "/index.html",
    "/menu": "/menu.html",
    "/events": "/events.html",
    "/hiring": "/hiring.html",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        raw = unquote(urlsplit(path).path)
        key = raw.rstrip("/") or "/"
        if key in PRETTY:
            path = PRETTY[key]
        return super().translate_path(path)


if __name__ == "__main__":
    port = 8765
    ThreadingHTTPServer.allow_reuse_address = True
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("Tacos Jalisco — open these (no .html in the URL):", flush=True)
    print(f"  http://127.0.0.1:{port}/", flush=True)
    print(f"  http://127.0.0.1:{port}/events", flush=True)
    print(f"  http://127.0.0.1:{port}/menu", flush=True)
    print(f"  http://127.0.0.1:{port}/hiring", flush=True)
    httpd.serve_forever()

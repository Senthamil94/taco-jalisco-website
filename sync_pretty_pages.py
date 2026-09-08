#!/usr/bin/env python3
"""Copy events.html / menu.html / hiring.html to extensionless bucket keys.

Live is a Lightsail bucket + Lightsail CDN. The CDN cannot rewrite /events
to events.html (no CloudFront Functions in Lightsail). GET /events looks
for an object named "events" and returns AccessDenied if it is missing.

Upload these copies to the Lightsail bucket with Content-Type text/html
(same public access as the .html files), then invalidate the CDN cache.

Re-run this after editing those HTML files (serve.py does it on start).
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent / "site"
PAGES = ("events", "menu", "hiring")


def sync():
    written = []
    for name in PAGES:
        src = ROOT / f"{name}.html"
        dest = ROOT / name
        if not src.is_file():
            raise SystemExit(f"missing {src}")
        dest.write_bytes(src.read_bytes())
        written.append(str(dest.relative_to(ROOT.parent)))
    return written


if __name__ == "__main__":
    for path in sync():
        print("wrote", path)

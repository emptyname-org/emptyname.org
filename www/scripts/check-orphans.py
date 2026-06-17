#!/usr/bin/env python3
"""Flag static assets that nothing references (and junk filenames).

Catches the cruft that crept in during the WordPress migration: duplicate copies,
download artifacts whose URL query string got baked into the filename ("...mp4?_=1"),
WP-resized variants, and old versions left behind.

Matching is by BASENAME across every place that can reference an asset
(content / data / layouts / assets / served static HTML+JS+CSS). Basename matching
is deliberately loose - it never flags a file that is actually used, even when the
reference uses a relative path or an extension a naive URL-regex would miss
(.m4v, .webm, ...). It only reports; it never deletes.

Run from the Hugo project root (www/). Exit status 1 if anything is flagged,
so it can gate a deploy.
"""
import os, re, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # www/
os.chdir(ROOT)

ASSET_DIRS = ["static/uploads", "static/media", "static/img"]
REF_GLOBS = ["content/**/*", "data/**/*", "layouts/**/*", "assets/**/*",
             "static/**/*.html", "static/**/*.js", "static/**/*.css"]

# build one big haystack of everything that can reference an asset
haystack = []
for pat in REF_GLOBS:
    for f in glob.glob(pat, recursive=True):
        if os.path.isfile(f) and not f.startswith("static/uploads") and not f.startswith("static/media"):
            try:
                haystack.append(open(f, encoding="utf-8", errors="ignore").read())
            except Exception:
                pass
HAY = "\n".join(haystack)

orphans, junk = [], []
for d in ASSET_DIRS:
    for f in glob.glob(d + "/**/*", recursive=True):
        if not os.path.isfile(f):
            continue
        name = os.path.basename(f)
        if re.search(r"[?\s]", name):           # download artifact / unsafe name
            junk.append(f)
            continue
        if name not in HAY:                       # nothing references this basename
            orphans.append(f)

def mb(paths): return sum(os.path.getsize(p) for p in paths) / 1024 / 1024

if junk:
    print(f"JUNK filenames ({len(junk)}, {mb(junk):.1f} MB) - rename or delete:")
    for f in sorted(junk): print("  ", f)
if orphans:
    print(f"UNREFERENCED assets ({len(orphans)}, {mb(orphans):.1f} MB):")
    for f in sorted(orphans): print("  ", f, f"({os.path.getsize(f)//1024} KB)")
if not junk and not orphans:
    print("clean - no orphaned or junk static assets")
    sys.exit(0)
sys.exit(1)

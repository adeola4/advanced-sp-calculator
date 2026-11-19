#!/usr/bin/env python3
"""Inline msc_core.js into the HTML so the published page works from a single file."""
import pathlib

root = pathlib.Path(__file__).parent
core = (root / "msc_core.js").read_text()
html = (root / "app.html").read_text()

inline = "<script>\n" + core + "\n</script>"
out = html.replace('<script src="msc_core.js"></script>', inline)
assert '<script src="msc_core.js"></script>' not in out, "core script tag not replaced"

(root / "index.html").write_text(out)
(root / "index.html").write_text(out)
print(f"built index.html ({len(out)} bytes)")

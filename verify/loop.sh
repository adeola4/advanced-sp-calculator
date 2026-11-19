#!/usr/bin/env bash
# verify/loop.sh — the accuracy gate. Run after ANY change to msc_core.js or app.html.
# 1. every harvested MSCW calculator case must match to the point
# 2. the anchor suite must pass
# 3. the UI must still render and compute
set -e
cd "$(dirname "$0")/.."
echo "── 1. model vs MSCW calculator (verify/anchors.json) ──"
node verify/compare.js
echo "── 2. anchor suite ──"
node msc_test.js | tail -2
echo "── 3. build + UI ──"
python3 build.py
node ui_smoke.js index.html | tail -2
echo "ALL GREEN — model reproduces the MSCW calculator"

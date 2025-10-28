#!/usr/bin/env bash
set -e
cd ~/projects/truth-unveiled-platform

OUT="authenticity_phase_xxxvii.log"
echo "=== Phase XXXVII: Full Authenticity & Integrity Audit ===" > "$OUT"
date >> "$OUT"
echo >> "$OUT"

echo "[SCAN] Searching for placeholder/demo/mock/simulation..." | tee -a "$OUT"
grep -rE "(placeholder|demo|mock|simulation)" --exclude-dir=node_modules --color=never . >> "$OUT" 2>&1 || echo "✅ No placeholder/demo/mock/simulation found." >> "$OUT"

echo "[VALIDATE] Checking JSON files..." | tee -a "$OUT"
find . -type f -name "*.json" | while read -r file; do
  if ! jq empty "$file" 2>/dev/null; then
    echo "❌ Invalid JSON: $file" >> "$OUT"
  fi
done

echo "[VALIDATE] Checking HTML files..." | tee -a "$OUT"
find . -type f -name "*.html" | while read -r file; do
  if ! grep -q "<html" "$file"; then
    echo "⚠️  Possible malformed HTML: $file" >> "$OUT"
  fi
done

echo "[CHECK] Testing local service endpoints..." | tee -a "$OUT"
for port in 7078 7079 7080; do
  if curl -s "http://127.0.0.1:$port" > /dev/null; then
    echo "✅ Service on port $port reachable." >> "$OUT"
  else
    echo "⚠️  Service on port $port unreachable." >> "$OUT"
  fi
done

echo >> "$OUT"
echo "Audit complete — see $OUT for full results." | tee -a "$OUT"

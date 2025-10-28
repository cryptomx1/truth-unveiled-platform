#!/usr/bin/env bash
# ============================================================
# Truth Unveiled — REAL DID Onboarding Launcher (no mock)
# Verifies live services then opens the onboarding UI.
# ============================================================

set -euo pipefail

API="http://127.0.0.1:7078"
UI="http://127.0.0.1:7079"
LABEL="${1:-Mark}"   # optional: you can run ./did_onboard.sh "Your Name"

banner() {
  echo
  echo "============================================================"
  echo " $1"
  echo "============================================================"
}

fail() { echo "❌ $1"; exit 1; }
ok()   { echo "✅ $1"; }

# 1) Quick port sanity (process must be listening)
banner "Checking service ports"
for PORT in 7078 7079; do
  if ss -lnt | awk '{print $4}' | grep -q ":$PORT$"; then
    ok "Port $PORT is listening"
  else
    fail "Port $PORT is NOT listening. Ensure PM2 services are online (binder=7078, onboarding=7079)."
  fi
done

# 2) Check UI returns HTML
banner "Checking Onboarding UI at $UI"
UI_HEAD=$(curl -sI "$UI" || true)
echo "$UI_HEAD" | head -n 1 | grep -q "200" || fail "UI did not return HTTP 200. Got: $(echo "$UI_HEAD" | head -n 1)"
UI_BODY=$(curl -s "$UI" | head -n 5)
echo "$UI_BODY" | grep -qi "<!doctype html" || fail "UI did not return HTML. First lines were:\n$UI_BODY"
ok "Onboarding UI is serving HTML"

# 3) Check /seed/new (REAL)
banner "Checking real /seed/new at $API"
SEED_JSON=$(curl -s "$API/seed/new") || fail "Failed to GET /seed/new"
echo "$SEED_JSON" | grep -q '"ok":true' || fail "Seed endpoint did not return ok:true: $SEED_JSON"
SEED=$(echo "$SEED_JSON" | sed -E 's/.*"seed":"?([^"]*)"?.*/\1/')
ok "Seed endpoint OK — mnemonic captured"

# 4) Check /did/init (REAL). This writes DID metadata server-side.
banner "Initializing DID at $API"
DID_JSON=$(curl -s -X POST "$API/did/init" \
  -H "Content-Type: application/json" \
  -d "{\"label\":\"$LABEL\"}") || fail "POST /did/init failed"
echo "$DID_JSON" | grep -q '"ok":true' || fail "DID init did not return ok:true: $DID_JSON"
DID=$(echo "$DID_JSON" | sed -E 's/.*"did":"([^"]+)".*/\1/')
ok "DID created: $DID"

# 5) Final reminder & open browser
banner "Launching Onboarding UI"
echo "Your DID: $DID"
echo "Your Seed (from step 3):"
echo "  $SEED"
echo
echo "In the web page:"
echo "  1) Click “Generate Seed” (or paste the seed above if you want)."
echo "  2) Click “Create Auth Secret” → scan the QR in your TOTP app."
echo "  3) Enter 6-digit code → Verify."
echo "  4) Paste DID: $DID"
echo "  5) Click “Bind & Encrypt”. You should see a success message."
echo

# Open default browser (best effort)
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$UI" >/dev/null 2>&1 || true
elif command -v sensible-browser >/dev/null 2>&1; then
  sensible-browser "$UI" >/dev/null 2>&1 || true
else
  echo "Open this link manually: $UI"
fi

ok "Onboarding page opened. Proceed with the steps above."


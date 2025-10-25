#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/mark/projects/truth-unveiled"
LOGDIR="$ROOT/logs"
AUDITLOG="$LOGDIR/audit_$(date -Iseconds).log"
IPNS_ID="k51qzi5uqu5dh45qt3n8yyw7dz9155l8ajajgzab1e3ehjuaw7lml8mkx4myhm"

pass() { echo -e "✅ $1" | tee -a "$AUDITLOG"; }
fail() { echo -e "❌ $1" | tee -a "$AUDITLOG"; exit 1; }

echo "=== LIVE AUDIT $(date -Iseconds) ===" | tee -a "$AUDITLOG"
mkdir -p "$LOGDIR"

cd "$ROOT"

# 1) Source control + environment sanity
if [ ! -d ".git" ]; then
  fail "Repo not initialized as a git project at $ROOT"
else
  pass "Git repo present"
fi

if [ ! -f ".env" ]; then
  fail ".env missing"
else
  # Check for placeholders
  if grep -Eqi 'your_|REPLACE_ME|<token>|<key>' .env; then
    fail ".env contains placeholder values"
  else
    pass ".env contains no placeholder values"
  fi
fi

# 2) Scan for mock/sim/placeholder code
PATTERNS='simulate|simulation|placeholder|dummy|mock|stub|fake|hardcoded|lorem|sample data|test only|TODO|FIXME'
if grep -RInE "$PATTERNS" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=logs . > /tmp/audit_suspect.txt || true; then
  if [ -s /tmp/audit_suspect.txt ]; then
    echo "---- Suspicious matches ----" | tee -a "$AUDITLOG"
    cat /tmp/audit_suspect.txt | tee -a "$AUDITLOG"
    fail "Suspicious strings found above — review required"
  else
    pass "No mock/sim/placeholder markers found"
  fi
fi

# 3) Scan for hard-coded IPFS hashes that could bypass live flow
HASH_RE='(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[0-9a-z]{50,})'
if grep -RInE "$HASH_RE" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=logs . > /tmp/audit_hashes.txt || true; then
  # Allow known IPNS in config/scripts, but flag hardcoded CIDs in HTML/JS/TS configs
  if [ -s /tmp/audit_hashes.txt ]; then
    echo "---- Hard-coded hashes found (review) ----" | tee -a "$AUDITLOG"
    cat /tmp/audit_hashes.txt | tee -a "$AUDITLOG"
    echo "(Note: IPNS in config is OK; static CIDs in app code should be avoided.)" | tee -a "$AUDITLOG"
  fi
  pass "Hash scan completed"
fi

# 4) Check required scripts exist
[ -f "update-ipfs.cjs" ] || fail "update-ipfs.cjs missing"
[ -f "watch-ipfs.sh" ]   || fail "watch-ipfs.sh missing"
pass "Updater & watcher scripts present"

# 5) Verify PM2 watcher is the active runner and points to the correct script
if command -v pm2 >/dev/null 2>&1; then
  pm2 describe ipfs-watcher >/tmp/pm2_desc.txt 2>/dev/null || fail "PM2 process 'ipfs-watcher' not found"
  if ! grep -q "watch-ipfs.sh" /tmp/pm2_desc.txt; then
    fail "PM2 'ipfs-watcher' is not running the expected script"
  fi
  pass "PM2 'ipfs-watcher' correctly configured"
else
  fail "PM2 not installed or not in PATH"
fi

# 6) IPFS daemon + identity
ipfs id >/tmp/ipfs_id.json 2>/dev/null || fail "IPFS daemon not responding"
pass "IPFS daemon responding"

# 7) Verify IPNS -> CID resolves and matches latest publish
CURR_RESOLVE=$(ipfs resolve /ipns/$IPNS_ID | sed 's/^\/ipfs\///')
if [ -z "$CURR_RESOLVE" ]; then
  fail "IPNS did not resolve to a CID"
else
  pass "IPNS currently resolves to: $CURR_RESOLVE"
fi

# 8) End-to-end live update test (non-destructive)
TESTSTAMP="audit-$(date +%s)"
echo "$TESTSTAMP" > .audit_live_probe.txt
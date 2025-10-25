#!/bin/bash
# === Truth Unveiled Autostart & Repair Script ===

cd ~/projects/truth-unveiled-platform || exit 1

echo "🔧 Converting service files to ES modules..."
for f in services/*.cjs; do
  mv "$f" "${f%.cjs}.mjs" 2>/dev/null
done

echo "🧩 Updating package.json type..."
jq '. + {"type":"module"}' package.json > tmp.json && mv tmp.json package.json

echo "📦 Installing dependencies..."
npm install --silent

echo "⚙️  Ensuring PM2 and IPFS are running..."
if ! pgrep -x "pm2" > /dev/null; then
  pm2 resurrect >/dev/null 2>&1 || pm2 start
fi
if ! pgrep -x "ipfs" > /dev/null; then
  ipfs daemon --init >/dev/null 2>&1 &
  sleep 10
fi

echo "🚀 Starting Truth Unveiled services..."
pm2 start services/seed.mjs --name seed-svc
pm2 start services/auth.mjs --name totp-svc
pm2 start services/binder.mjs --name did-binder
pm2 start services/encryptor.mjs --name encryptor
pm2 start tools/ipfs-watcher.mjs --name ipfs-watcher

echo "💾 Saving PM2 session..."
pm2 save

echo "✅ All systems initialized. Current status:"
pm2 list

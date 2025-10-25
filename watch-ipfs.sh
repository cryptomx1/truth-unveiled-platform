#!/bin/bash
WATCH_DIR="/home/mark/projects/truth-unveiled"
LOG_FILE="$WATCH_DIR/logs/ipfs_watcher.log"

echo "👁️  Watching $WATCH_DIR for file changes..." | tee -a "$LOG_FILE"

inotifywait -m -r -e modify,create,delete,move --exclude '(\.git|\.env|logs)' "$WATCH_DIR" | while read path action file; do
  echo "🌀 Change detected: $file ($action) at $(date -Iseconds)" | tee -a "$LOG_FILE"
  node "$WATCH_DIR/update-ipfs.cjs" --silent
done
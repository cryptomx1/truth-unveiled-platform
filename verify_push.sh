#!/bin/bash
# Post-push verification script for Phase XXXV
# Confirms that the remote GitHub repo matches the local verified commit

echo "🔍 Verifying push to GitHub..."

# Get local HEAD hash
LOCAL_HASH=$(git rev-parse HEAD)
echo "Local commit hash: $LOCAL_HASH"

# Get remote HEAD hash (assumes 'origin' is GitHub remote)
REMOTE_HASH=$(git ls-remote origin HEAD | awk '{print $1}')
echo "Remote commit hash: $REMOTE_HASH"

# Compare
if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
    echo "✅ SUCCESS: Push verified! Local and remote hashes match."
    echo "📦 Phase XXXV Gold Build is live on GitHub."
else
    echo "❌ FAILURE: Hash mismatch detected."
    echo "   This could indicate a push failure or tampering."
    echo "   Please re-push or investigate."
    exit 1
fi

echo ""
echo "🎉 Verification complete. Repository is production-ready."
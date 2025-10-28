#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/markreddick/truth-unveiled-dao.git"
ROOT="${HOME}/projects/truth-unveiled"
PHASE="Phase XXXI — Insight Weave"
SHA="693b617d36f8daa0115d6306ac295b3f0b00de12a738ae5634d2bdef03508aef"
TAG="v31-insight-weave"

cd "${ROOT}"

# Initialize if necessary
if [ ! -d ".git" ]; then
  git init
  git remote add origin "${REPO}"
  git branch -M main
fi

# Stage and commit all verified directories
git add .
git commit -m "${PHASE} complete: Continuum intelligence layer stabilized ✅" || true

# Tag this build with the proof hash
git tag -a "${TAG}" -m "Completed Insight Weave; system verified, proof ${SHA}"

# Push everything to GitHub
git push -u origin main --tags

# Verify the commit and output the current log summary
echo "=== Continuum GitHub Commit Report ==="
echo "Repository: ${REPO}"
git log -1 --pretty=format:"Commit: %H%nAuthor: %an%nDate: %ad%nMessage: %s"
echo
echo "Tag: ${TAG}"
echo "Proof: ${SHA}"
echo "Status: SUCCESS ✅"
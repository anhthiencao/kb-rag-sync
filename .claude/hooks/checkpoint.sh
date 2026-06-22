#!/usr/bin/env bash
# UserPromptSubmit: snapshot the full working tree (incl. untracked) into a
# chained ref refs/checkpoints/latest WITHOUT touching the real index or branch
# history. Enables `/rollback-checkpoint` to restore the last pre-prompt state.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

# Use a NON-existent path: git builds a fresh index there. An empty 0-byte file
# (what plain mktemp creates) is treated as a corrupt index and git add fails.
TMP_INDEX="$(mktemp -u 2>/dev/null)" || exit 0
trap 'rm -f "$TMP_INDEX"' EXIT
export GIT_INDEX_FILE="$TMP_INDEX"

git add -A 2>/dev/null || exit 0
TREE="$(git write-tree 2>/dev/null)" || exit 0
[ -z "$TREE" ] && exit 0

PARENT="$(git rev-parse --verify -q refs/checkpoints/latest || true)"
if [ -n "$PARENT" ]; then
  COMMIT="$(git commit-tree "$TREE" -p "$PARENT" -m "checkpoint" 2>/dev/null)"
else
  COMMIT="$(git commit-tree "$TREE" -m "checkpoint" 2>/dev/null)"
fi
[ -n "$COMMIT" ] && git update-ref refs/checkpoints/latest "$COMMIT" 2>/dev/null
exit 0

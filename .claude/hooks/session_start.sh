#!/usr/bin/env bash
# SessionStart: inject current constraint-gate status into context so the model
# knows what's already done vs outstanding the moment a session begins.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
SUMMARY="$(node "$ROOT/scripts/validate.mjs" --summary 2>/dev/null || echo "[gate] unavailable")"
node -e '
const s = process.argv[1];
process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:"Constraint gate status: "+s}}));
' "$SUMMARY"
exit 0

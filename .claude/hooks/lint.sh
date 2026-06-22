#!/usr/bin/env bash
# PostToolUse(Write|Edit): lint TypeScript/JavaScript files immediately with ESLint.
# Blocks (feeds the error back to Claude) only on a real lint failure of a .ts/.js file.
set -uo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Read hook stdin ONCE.
INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try{const d=JSON.parse(s);const ti=d.tool_input||{},tr=d.tool_response||{};
  process.stdout.write(ti.file_path||tr.filePath||"");}catch{process.stdout.write("");}
});' 2>/dev/null || true)"

[ -z "${FILE:-}" ] && exit 0
case "$FILE" in *.ts|*.js|*.mjs|*.cjs) ;; *) exit 0 ;; esac
[ -f "$FILE" ] || exit 0

# Only lint if eslint is installed in the project.
[ -x "$ROOT/node_modules/.bin/eslint" ] || exit 0

if ! out="$(cd "$ROOT" && ./node_modules/.bin/eslint "$FILE" 2>&1)"; then
  printf '%s' "$out" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  process.stdout.write(JSON.stringify({decision:"block",reason:"ESLint reported errors:\n"+s+"\nFix them (try `npm run format` / eslint --fix)."}));
});'
fi
exit 0

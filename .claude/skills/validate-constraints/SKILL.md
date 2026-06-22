---
name: validate-constraints
description: Run the full constraint gate and print a pass/fail report. Use to check whether the project meets all deliverable requirements before finishing.
---

# Validate constraints

Runs `scripts/validate.mjs` — the single source of truth for "done". Same checks the
`Stop` hook enforces, but on demand and non-blocking.

## Run

```
node scripts/validate.mjs            # human report, exit 1 if any REQUIRED fails
node scripts/validate.mjs --json     # machine-readable
```

## Required checks

- `articles>=30` — Markdown files in `data/articles/`
- `no-hardcoded-secrets` — no `sk-...` keys in `src/`/`scripts/`
- `.env.sample` present, `.env` gitignored
- `Dockerfile`, `README.md` present
- `manifest.json` valid (if present)
- `tests` — `npm test` (vitest) passes

## Warnings (non-blocking)

- `repo-name-cryptic` — repo/remote must not contain "optisigns"

Fix every [FAIL] before declaring the task complete.

# OptiBot Mini-Clone — Project Rules & Agentic Workflow

RAG support-bot pipeline: scrape OptiSigns support docs → clean Markdown → upload to
OpenAI Vector Store via API → "OptiBot" Assistant answers with citations → Dockerized
daily job on DigitalOcean with incremental (delta) upload.

See `docs/PLAN.md` for the full architecture, tech stack, and grading map.

## Language policy (hard rule)

- **Every project artifact is written in English**: this file, `docs/**`, code,
  comments, docstrings, log messages, skill files, hook scripts, commit messages,
  PR descriptions, README, test names — everything committed to the repo.
- **Vietnamese is allowed ONLY in the live chat** between the user and the assistant
  (the user asks in Vietnamese, the assistant replies in Vietnamese). It must never
  appear in any file or artifact.

## Locked decisions

- Scheduler: DigitalOcean App Platform **Scheduled Job** (cron daily).
- State/manifest: **commit `data/manifest.json` back to the repo** each run
  (`git pull --rebase` before push; commit subject ends with `[skip ci]`).
- Language/runtime: **Node.js 20 + TypeScript** (the company confirmed any language;
  Node.js matches the Full-Stack role). Deps via **npm + package.json**.
- Browser automation: **Playwright MCP** (configured in `.mcp.json`).

## Closed-loop quality workflow

The session is gated so work cannot "finish" until all constraints pass.

1. **Checkpoint** — `UserPromptSubmit` snapshots the full tree into
   `refs/checkpoints/latest` (no history pollution). Restore via `/rollback-checkpoint`.
   Native `/rewind` is also enabled (`fileCheckpointingEnabled`).
2. **Lint on write** — `PostToolUse(Write|Edit)` runs ESLint on every `.ts`/`.js`
   file (if installed); a failure is fed back for an immediate fix.
3. **Constraint gate on stop** — `Stop` runs `scripts/validate.mjs --gate`. If any
   REQUIRED constraint fails it **blocks** and returns the unmet list, so the agent
   keeps working. Safety valve: after **3** consecutive blocks it allows the stop with
   a warning (prevents infinite loops on things that genuinely can't pass this session).
4. **Manual gate** — `/validate-constraints` runs the same checks on demand.

`scripts/validate.mjs` is the single source of truth for "done". Required constraints:
≥30 Markdown articles, no hard-coded secrets, `.env.sample` present, `.env` gitignored,
`Dockerfile`, `README.md`, valid `manifest.json`, and passing `npm test` (vitest).

## Skills (in `.claude/skills/`)

- `/scrape` — run/extend the Zendesk → Markdown scraper.
- `/upload` — upload Markdown to the OpenAI Vector Store (API only).
- `/verify-playground` — drive the OpenAI Playground via Playwright MCP, ask the sample
  question, capture the cited-answer screenshot into `docs/images/`.
- `/validate-constraints` — run the full constraint gate and print a report.
- `/rollback-checkpoint` — restore the working tree to the last pre-prompt checkpoint.

Built-in skills to lean on: `/code-review`, `/security-review`, `/verify`, `/run`.

## Conventions

- Node.js 20 + TypeScript (ESM, NodeNext); format/lint with Prettier + ESLint.
- No secrets in code — read from env via `src/config.ts`; keep `.env.sample` in sync.
- Repo name must NOT contain "optisigns" (cryptic name).
- Keep commits clear and scoped.

---
name: verify-playground
description: Drive the OpenAI Playground via Playwright MCP to ask the sample question and capture the cited-answer screenshot. Use for the deliverable screenshot and answer-quality sanity checks.
---

# Verify the Assistant in the Playground (browser automation)

Uses the **Playwright MCP** server (see `.mcp.json`). Browser tools appear via
ToolSearch (query `playwright`).

## Flow

1. Open `https://platform.openai.com/playground/assistants` (or the Assistants UI).
   The user must already be logged in; if a login wall appears, ask the user to run
   the login in their browser, then continue.
2. Select the OptiBot Assistant (`ASSISTANT_ID`).
3. Send the sample question: **"How do I add a YouTube video?"**
4. Wait for the reply; confirm it is grounded and contains `Article URL:` citation(s).
5. Capture a screenshot to `docs/images/playground-answer.png`.

## Pass criteria

- Answer is factual, <= 5 bullets, and cites the source (`Article URL:` / `[n]`).
- Screenshot saved and referenced from `README.md`.

## Runnable helper

`npm run verify-playground` (`scripts/verifyPlayground.ts`) drives a headed Chromium
with a persistent profile (`.pwprofile/`, gitignored) so login is remembered, auto-types
the question, and screenshots when a cited answer appears. Requires
`npx playwright install chromium` once.

If the browser is unavailable, fall back to the API to confirm the answer text +
citations, and tell the user to take the screenshot manually.

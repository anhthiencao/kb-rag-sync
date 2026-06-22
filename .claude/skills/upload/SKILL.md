---
name: upload
description: Upload Markdown files to the OpenAI Vector Store via API (no UI drag-and-drop). Use when wiring src/store or running the delta upload.
---

# Upload Markdown to OpenAI Vector Store (API only)

Mandatory: programmatic upload — Files API + Vector Stores API. No UI upload.
Code: `src/store/openaiUploader.ts` + `src/store/manifest.ts`.

## Steps

1. Reuse `VECTOR_STORE_ID` from env, else `ensureStore` creates one and the pipeline
   logs the id to put in `.env`.
2. Files API upload runs in parallel; a single **file batch** attaches them all and
   OpenAI embeds concurrently server-side (`uploadMany`).
3. Chunking strategy (explain in README): `static`,
   `max_chunk_size_tokens=MAX_CHUNK_SIZE_TOKENS` (800),
   `chunk_overlap_tokens=CHUNK_OVERLAP_TOKENS` (400).
4. On UPDATE: delete the old vector-store file (mapping `article_id -> file_id` in the
   manifest), then upload the new one.
5. **Log counts**: added / updated / skipped, files embedded, estimated chunks.

## Delta logic

Compare each article's rendered Markdown hash against `data/manifest.json`. Classify
ADDED / UPDATED / SKIPPED. Upload only ADDED + UPDATED.

## Run

```
npm run dev               # tsx src/main.ts — full pipeline: scrape + delta upload
npm run dry-run           # no OpenAI calls; print planned counts
npm run create-assistant  # one-time: create the OptiBot Assistant
```

## Done check

Logs show non-zero `filesEmbedded` on first run; `/verify-playground` returns a
cited answer.

---
name: scrape
description: Run or extend the Zendesk -> Markdown scraper for OptiSigns support docs. Use when fetching/refreshing articles or working on src/scraper.
---

# Scrape OptiSigns support articles to Markdown

Goal: pull >= 30 articles from `support.optisigns.com` and write clean
`data/articles/<id>-<slug>.md` files.

## Source

Zendesk Help Center public API (no auth for public content):
`https://support.optisigns.com/api/v2/help_center/{locale}/articles.json?page=N`
Follow `next_page` until null. Locale via `ZENDESK_LOCALE` (default `en-us`).

## Cleaning rules (preserve quality)

- Convert HTML body with `turndown`; pre-clean with `cheerio`.
- KEEP: headings, relative links, code blocks, lists, tables.
- REMOVE: nav, scripts, styles, ads, share widgets, breadcrumbs.
- Prepend a metadata header to each file:

  ```
  # {title}

  Article URL: {html_url}
  Article ID: {id}
  ```

  so the Assistant can cite `Article URL:` lines.

Code: `src/scraper/zendeskClient.ts` + `src/scraper/markdownConverter.ts`.

## Run

```
npm run scrape        # tsx src/main.ts --scrape-only — writes data/articles/*.md, no upload
```

## Done check

`ls data/articles/*.md | wc -l` >= 30, and `/validate-constraints` passes the
`articles>=30` check. Spot-check one file keeps headings/links/code intact.

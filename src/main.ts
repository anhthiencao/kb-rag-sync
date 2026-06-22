#!/usr/bin/env node
/**
 * OptiBot scraper-uploader entrypoint.
 *
 *   node dist/main.js                # scrape + delta upload to OpenAI Vector Store
 *   node dist/main.js --scrape-only  # scrape + write .md + manifest, no OpenAI
 *   node dist/main.js --dry-run      # preview counts, no OpenAI, no persistence
 *
 * Designed to run once and exit 0 (suitable for `docker run` and a daily job).
 */
import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { runPipeline } from './pipeline.js';

async function main(argv: string[]): Promise<number> {
  const scrapeOnly = argv.includes('--scrape-only');
  const dryRun = argv.includes('--dry-run');
  const cfg = loadConfig();
  try {
    const result = await runPipeline(cfg, { dryRun, scrapeOnly });
    // Non-zero exit if any individual upload failed, so the job surfaces problems.
    return result.failures.length > 0 ? 1 : 0;
  } catch (e) {
    logger.error('pipeline failed', { error: String(e) });
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code));

/**
 * Orchestrate the full flow: scrape -> Markdown -> delta -> (upload) -> manifest.
 *
 *   default      scrape + delta upload to OpenAI + persist manifest (with file ids)
 *   scrapeOnly   scrape + write .md + persist manifest hashes (no OpenAI calls)
 *   dryRun       scrape + classify + log planned counts (no OpenAI, no persistence)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ARTICLES_DIR, MANIFEST_PATH, type Config, zendeskBaseUrl } from './config.js';
import { logger } from './logger.js';
import { articleSlug, toMarkdown } from './scraper/markdownConverter.js';
import { ZendeskClient } from './scraper/zendeskClient.js';
import { pushManifest } from './store/githubManifest.js';
import { ADDED, Manifest, SKIPPED, UPDATED } from './store/manifest.js';
import {
  type UploadItem,
  type UploadResult,
  VectorStoreUploader,
  estimateChunks,
  getClient,
  newResult,
} from './store/openaiUploader.js';

export interface RunOptions {
  dryRun?: boolean;
  scrapeOnly?: boolean;
  /** Override output locations (tests inject a tmp dir). */
  articlesDir?: string;
  manifestPath?: string;
  /** Inject a fake uploader (tests avoid real OpenAI calls). */
  uploaderOverride?: Pick<VectorStoreUploader, 'uploadMany' | 'vectorStoreId'>;
}

export async function runPipeline(cfg: Config, opts: RunOptions = {}): Promise<UploadResult> {
  const dryRun = opts.dryRun ?? false;
  const scrapeOnly = opts.scrapeOnly ?? false;
  const doUpload = !(dryRun || scrapeOnly);
  const articlesDir = opts.articlesDir ?? ARTICLES_DIR;
  const manifestPath = opts.manifestPath ?? MANIFEST_PATH;

  const manifest = Manifest.load(manifestPath);
  const result = newResult();
  let vectorStoreId = cfg.vectorStoreId;
  let uploader: VectorStoreUploader | undefined;

  if (doUpload) {
    if (opts.uploaderOverride) {
      uploader = opts.uploaderOverride as VectorStoreUploader;
      vectorStoreId = opts.uploaderOverride.vectorStoreId || vectorStoreId || 'vs_test';
    } else {
      if (!cfg.openaiApiKey) {
        throw new Error(
          'OPENAI_API_KEY is required for upload (use --dry-run/--scrape-only otherwise)',
        );
      }
      const client = getClient(cfg.openaiApiKey);
      [uploader, vectorStoreId] = await VectorStoreUploader.ensureStore(client, cfg.vectorStoreId, {
        name: 'OptiBot Docs',
        maxChunkTokens: cfg.maxChunkSizeTokens,
        overlapTokens: cfg.chunkOverlapTokens,
      });
    }
    logger.info('using vector store', { vector_store_id: vectorStoreId });
  }

  const zd = new ZendeskClient(zendeskBaseUrl(cfg), cfg.zendeskLocale);
  mkdirSync(articlesDir, { recursive: true });

  const pending: Array<UploadItem & { articleId: number; slug: string; updatedAt: string }> = [];

  for await (const article of zd.iterArticles()) {
    const mdText = toMarkdown(article);
    const slug = articleSlug(article);
    const filename = `${slug}.md`;
    if (!dryRun) writeFileSync(path.join(articlesDir, filename), mdText, 'utf-8');

    let status = manifest.classify(article.id, mdText);
    // Hash may match a prior scrape-only run that never uploaded (fileId null);
    // in upload mode such an article still needs to be embedded.
    if (doUpload && status === SKIPPED && manifest.fileId(article.id) === null) {
      status = ADDED;
    }

    if (status === ADDED) result.added += 1;
    else if (status === UPDATED) result.updated += 1;
    else result.skipped += 1;

    if (status === ADDED || status === UPDATED) {
      result.estimatedChunks += estimateChunks(
        mdText,
        cfg.maxChunkSizeTokens,
        cfg.chunkOverlapTokens,
      );
      if (doUpload) {
        pending.push({
          articleId: article.id,
          slug,
          filename,
          mdText,
          updatedAt: article.updatedAt,
          oldFileId: status === UPDATED ? manifest.fileId(article.id) : null,
        });
      }
    }

    if (scrapeOnly) {
      manifest.record(article.id, {
        mdText,
        slug,
        updatedAt: article.updatedAt,
        fileId: manifest.fileId(article.id),
      });
    }
  }

  if (doUpload && uploader && pending.length > 0) {
    try {
      const fileIds = await uploader.uploadMany(pending);
      pending.forEach((it, i) => {
        result.filesEmbedded += 1;
        manifest.record(it.articleId, {
          mdText: it.mdText,
          slug: it.slug,
          updatedAt: it.updatedAt,
          fileId: fileIds[i],
        });
      });
    } catch (e) {
      result.failures.push({ error: String(e) });
      logger.error('batch upload failed', { error: String(e) });
    }
  }

  if (!dryRun) {
    manifest.save(manifestPath);
    // Persist the delta baseline back to the repo (ephemeral containers lose state).
    if (cfg.githubToken && cfg.githubRepo) {
      try {
        const r = await pushManifest({
          token: cfg.githubToken,
          repo: cfg.githubRepo,
          branch: cfg.githubBranch,
          manifestPath,
        });
        logger.info('manifest commit-back', { ...r });
      } catch (e) {
        logger.error('manifest commit-back failed', { error: String(e) });
      }
    }
  }

  logger.info('pipeline complete', {
    ...result,
    mode: dryRun ? 'dry_run' : scrapeOnly ? 'scrape_only' : 'upload',
    vector_store_id: vectorStoreId,
  });
  return result;
}

/**
 * Delta state: maps each article id to its content hash + uploaded file id.
 *
 * Persisted as data/manifest.json and committed back to the repo so the daily job
 * knows what changed since last run (ADDED / UPDATED / SKIPPED).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const ADDED = 'ADDED';
export const UPDATED = 'UPDATED';
export const SKIPPED = 'SKIPPED';
export type Status = typeof ADDED | typeof UPDATED | typeof SKIPPED;

export interface ManifestEntry {
  hash: string;
  slug: string;
  updatedAt: string;
  fileId: string | null;
}

export function contentHash(text: string): string {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

export class Manifest {
  articles: Record<string, ManifestEntry>;

  constructor(data?: { articles?: Record<string, ManifestEntry> }) {
    this.articles = data?.articles ?? {};
  }

  static load(file: string): Manifest {
    if (existsSync(file)) {
      try {
        return new Manifest(JSON.parse(readFileSync(file, 'utf-8')));
      } catch {
        /* fall through to empty */
      }
    }
    return new Manifest();
  }

  save(file: string): void {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ articles: this.articles }, null, 2) + '\n', 'utf-8');
  }

  classify(articleId: number, mdText: string): Status {
    const entry = this.articles[String(articleId)];
    if (!entry) return ADDED;
    if (entry.hash !== contentHash(mdText)) return UPDATED;
    return SKIPPED;
  }

  fileId(articleId: number): string | null {
    return this.articles[String(articleId)]?.fileId ?? null;
  }

  record(
    articleId: number,
    opts: { mdText: string; slug: string; updatedAt: string; fileId: string | null },
  ): void {
    this.articles[String(articleId)] = {
      hash: contentHash(opts.mdText),
      slug: opts.slug,
      updatedAt: opts.updatedAt,
      fileId: opts.fileId,
    };
  }
}

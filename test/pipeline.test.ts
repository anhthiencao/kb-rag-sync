import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';
import type { Config } from '../src/config.js';
import { runPipeline } from '../src/pipeline.js';
import type { UploadItem } from '../src/store/openaiUploader.js';

const BASE = 'https://support.optisigns.com';
const PATH = '/api/v2/help_center/en-us/articles.json';

function cfg(overrides: Partial<Config> = {}): Config {
  return {
    openaiApiKey: '',
    vectorStoreId: '',
    assistantId: '',
    zendeskSubdomain: 'support.optisigns.com',
    zendeskLocale: 'en-us',
    maxChunkSizeTokens: 800,
    chunkOverlapTokens: 400,
    ...overrides,
  };
}

function payload(n: number) {
  return {
    articles: Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      title: `Article ${i + 1}`,
      body: `<p>body ${i + 1}</p>`,
      html_url: `${BASE}/hc/en-us/articles/${i + 1}`,
      updated_at: '2024-01-01T00:00:00Z',
      locale: 'en-us',
      draft: false,
    })),
    next_page: null,
  };
}

function tmp() {
  const dir = mkdtempSync(path.join(tmpdir(), 'pipeline-'));
  return { articlesDir: path.join(dir, 'articles'), manifestPath: path.join(dir, 'manifest.json') };
}

afterEach(() => nock.cleanAll());

describe('runPipeline', () => {
  it('scrape-only writes files and a manifest', async () => {
    nock(BASE).get(PATH).query(true).reply(200, payload(3));
    const t = tmp();
    const result = await runPipeline(cfg(), { scrapeOnly: true, ...t });

    expect(readdirSync(t.articlesDir).filter((f) => f.endsWith('.md'))).toHaveLength(3);
    expect(result.added).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.filesEmbedded).toBe(0);
    expect(existsSync(t.manifestPath)).toBe(true);
  });

  it('second run with no changes is all SKIPPED', async () => {
    nock(BASE).get(PATH).query(true).reply(200, payload(2));
    nock(BASE).get(PATH).query(true).reply(200, payload(2));
    const t = tmp();
    await runPipeline(cfg(), { scrapeOnly: true, ...t });
    const result = await runPipeline(cfg(), { scrapeOnly: true, ...t });
    expect(result.skipped).toBe(2);
    expect(result.added).toBe(0);
  });

  it('upload path uses the injected uploader', async () => {
    nock(BASE).get(PATH).query(true).reply(200, payload(2));
    const uploaded: string[] = [];
    const uploaderOverride = {
      vectorStoreId: 'vs_test',
      async uploadMany(items: UploadItem[]): Promise<string[]> {
        uploaded.push(...items.map((it) => it.filename));
        return items.map((it) => `file_${it.filename}`);
      },
    };
    const t = tmp();
    const result = await runPipeline(cfg({ openaiApiKey: 'sk-test-not-real' }), {
      ...t,
      uploaderOverride,
    });

    expect(result.filesEmbedded).toBe(2);
    expect(result.estimatedChunks).toBeGreaterThanOrEqual(2);
    expect(uploaded).toHaveLength(2);
  });
});

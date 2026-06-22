/**
 * Programmatic upload to an OpenAI Vector Store (Files API + Vector Stores API).
 * No UI drag-and-drop. Handles create-store, parallel upload + batch attach, and
 * delete-on-update.
 *
 * Chunking strategy (explained in README): STATIC chunking,
 * max_chunk_size_tokens=800, chunk_overlap_tokens=400 (~50% overlap). Support docs
 * are short-to-medium with clear headings, so 800 tokens captures a whole section
 * while the overlap preserves context across boundaries.
 */
import OpenAI, { toFile } from 'openai';

export interface UploadItem {
  filename: string;
  mdText: string;
  oldFileId?: string | null;
}

export interface UploadResult {
  added: number;
  updated: number;
  skipped: number;
  filesEmbedded: number;
  estimatedChunks: number;
  failures: Array<Record<string, unknown>>;
}

export function newResult(): UploadResult {
  return { added: 0, updated: 0, skipped: 0, filesEmbedded: 0, estimatedChunks: 0, failures: [] };
}

export function getClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

/** SDK moved vector_stores off `beta` over time; support both shapes. */
function vectorStores(client: OpenAI): any {
  return (client as any).vectorStores ?? (client as any).beta.vectorStores;
}

/** Estimate chunk count. tokens ~= chars/4; stride = max - overlap. */
export function estimateChunks(
  text: string,
  maxChunkTokens: number,
  overlapTokens: number,
): number {
  const tokens = Math.max(1, Math.floor(text.length / 4));
  const stride = Math.max(1, maxChunkTokens - overlapTokens);
  if (tokens <= maxChunkTokens) return 1;
  return Math.max(1, Math.ceil((tokens - overlapTokens) / stride));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export class VectorStoreUploader {
  constructor(
    private readonly client: OpenAI,
    public readonly vectorStoreId: string,
    private readonly maxChunkTokens = 800,
    private readonly overlapTokens = 400,
  ) {}

  private get chunkingStrategy() {
    return {
      type: 'static' as const,
      static: {
        max_chunk_size_tokens: this.maxChunkTokens,
        chunk_overlap_tokens: this.overlapTokens,
      },
    };
  }

  /** Reuse an existing store id, or create one. Returns [uploader, vectorStoreId]. */
  static async ensureStore(
    client: OpenAI,
    vectorStoreId: string,
    opts: { name?: string; maxChunkTokens?: number; overlapTokens?: number } = {},
  ): Promise<[VectorStoreUploader, string]> {
    let id = vectorStoreId;
    if (!id) {
      const store = await vectorStores(client).create({ name: opts.name ?? 'OptiBot Docs' });
      id = store.id;
    }
    return [new VectorStoreUploader(client, id, opts.maxChunkTokens, opts.overlapTokens), id];
  }

  private async deleteFile(fileId: string): Promise<void> {
    try {
      await vectorStores(this.client).files.del(this.vectorStoreId, fileId);
    } catch {
      /* ignore */
    }
    try {
      await this.client.files.del(fileId);
    } catch {
      /* ignore */
    }
  }

  private async createFile(filename: string, mdText: string): Promise<string> {
    const file = await this.client.files.create({
      file: await toFile(Buffer.from(mdText, 'utf-8'), filename),
      purpose: 'assistants',
    });
    return file.id;
  }

  /**
   * Bulk upload + attach. Files API uploads run in parallel; a single file batch
   * then attaches them all and OpenAI embeds them concurrently server-side.
   * Returns file ids aligned to `items`.
   */
  async uploadMany(items: UploadItem[], maxWorkers = 8): Promise<string[]> {
    if (items.length === 0) return [];

    for (const it of items) {
      if (it.oldFileId) await this.deleteFile(it.oldFileId);
    }

    const fileIds = await mapWithConcurrency(items, maxWorkers, (it) =>
      this.createFile(it.filename, it.mdText),
    );

    await vectorStores(this.client).fileBatches.createAndPoll(this.vectorStoreId, {
      file_ids: fileIds,
      chunking_strategy: this.chunkingStrategy,
    });
    return fileIds;
  }
}

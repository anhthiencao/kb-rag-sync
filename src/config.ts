/**
 * Centralized configuration. All secrets/tunables come from the environment.
 * Loads a local .env for development; in CI/DigitalOcean these are real env vars.
 * Nothing here is ever hard-coded.
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const ARTICLES_DIR = path.join(ROOT, 'data', 'articles');
export const MANIFEST_PATH = path.join(ROOT, 'data', 'manifest.json');

export interface Config {
  openaiApiKey: string;
  vectorStoreId: string;
  assistantId: string;
  zendeskSubdomain: string;
  zendeskLocale: string;
  maxChunkSizeTokens: number;
  chunkOverlapTokens: number;
  // Optional: when both set, the job commits data/manifest.json back to GitHub
  // (delta state persistence across ephemeral daily runs).
  githubToken: string;
  githubRepo: string; // owner/repo
  githubBranch: string;
}

function int(name: string, fallback: number): number {
  const v = parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(v) ? v : fallback;
}

/** The .env.sample placeholders (vs_xxx / asst_xxx) count as unset. */
function cleanId(value: string | undefined): string {
  const v = (value ?? '').trim();
  return v.endsWith('_xxx') ? '' : v;
}

export function loadConfig(): Config {
  const subdomain = process.env.ZENDESK_SUBDOMAIN || 'support.optisigns.com';
  return {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    vectorStoreId: cleanId(process.env.VECTOR_STORE_ID),
    assistantId: cleanId(process.env.ASSISTANT_ID),
    zendeskSubdomain: subdomain,
    zendeskLocale: process.env.ZENDESK_LOCALE || 'en-us',
    maxChunkSizeTokens: int('MAX_CHUNK_SIZE_TOKENS', 800),
    chunkOverlapTokens: int('CHUNK_OVERLAP_TOKENS', 400),
    githubToken: process.env.GITHUB_TOKEN ?? '',
    githubRepo: process.env.GITHUB_REPO ?? '',
    githubBranch: process.env.GITHUB_BRANCH || 'master',
  };
}

export function zendeskBaseUrl(cfg: Config): string {
  let host = cfg.zendeskSubdomain;
  if (!host.startsWith('http')) host = `https://${host}`;
  return host.replace(/\/+$/, '');
}

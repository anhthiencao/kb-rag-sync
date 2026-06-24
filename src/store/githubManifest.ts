/**
 * Persist data/manifest.json back to the repo via the GitHub Contents API.
 *
 * Ephemeral daily containers lose local state, so the delta baseline must survive
 * across runs. This commits the updated manifest (commit subject ends with
 * `[skip ci]` so it never triggers the build/deploy loop). No git binary needed.
 */
import { readFileSync } from 'node:fs';

const API = 'https://api.github.com';

export async function pushManifest(opts: {
  token: string;
  repo: string; // owner/repo
  branch: string;
  manifestPath: string;
  repoPath?: string; // path within the repo
}): Promise<{ ok: boolean; status: string }> {
  const repoPath = opts.repoPath ?? 'data/manifest.json';
  const headers = {
    Authorization: `Bearer ${opts.token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'optibot-job',
  };
  const url = `${API}/repos/${opts.repo}/contents/${repoPath}`;

  // Look up the current file SHA (required to update an existing file).
  let sha: string | undefined;
  const head = await fetch(`${url}?ref=${encodeURIComponent(opts.branch)}`, { headers });
  if (head.ok) {
    const json = (await head.json()) as { sha?: string };
    sha = json.sha;
  } else if (head.status !== 404) {
    return { ok: false, status: `GET ${head.status}` };
  }

  const content = Buffer.from(readFileSync(opts.manifestPath, 'utf-8'), 'utf-8').toString('base64');
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'chore: update delta manifest [skip ci]',
      content,
      branch: opts.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  return { ok: res.ok, status: `PUT ${res.status}` };
}

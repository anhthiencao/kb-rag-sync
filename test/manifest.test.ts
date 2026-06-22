import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ADDED, Manifest, SKIPPED, UPDATED, contentHash } from '../src/store/manifest.js';

describe('manifest', () => {
  it('content hash is deterministic and sensitive', () => {
    expect(contentHash('hello')).toBe(contentHash('hello'));
    expect(contentHash('hello')).not.toBe(contentHash('hellp'));
  });

  it('classifies ADDED / UPDATED / SKIPPED', () => {
    const m = new Manifest();
    expect(m.classify(1, 'v1')).toBe(ADDED);
    m.record(1, { mdText: 'v1', slug: '1-x', updatedAt: 't', fileId: 'file_1' });
    expect(m.classify(1, 'v1')).toBe(SKIPPED);
    expect(m.classify(1, 'v2')).toBe(UPDATED);
    expect(m.fileId(1)).toBe('file_1');
  });

  it('saves and loads round-trip', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'manifest-')), 'manifest.json');
    const m = new Manifest();
    m.record(42, { mdText: 'body', slug: '42-foo', updatedAt: 't', fileId: 'file_42' });
    m.save(file);

    const loaded = Manifest.load(file);
    expect(loaded.fileId(42)).toBe('file_42');
    expect(loaded.classify(42, 'body')).toBe(SKIPPED);
  });

  it('load of a missing file returns empty', () => {
    const m = Manifest.load(path.join(tmpdir(), 'does-not-exist-xyz.json'));
    expect(m.articles).toEqual({});
  });
});

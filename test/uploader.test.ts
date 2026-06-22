import { describe, expect, it } from 'vitest';
import { estimateChunks } from '../src/store/openaiUploader.js';

describe('estimateChunks', () => {
  it('short text is one chunk', () => {
    expect(estimateChunks('short', 800, 400)).toBe(1);
  });

  it('long text scales with stride', () => {
    // ~8000 chars => ~2000 tokens; stride = 800-400 = 400 => several chunks.
    expect(estimateChunks('x'.repeat(8000), 800, 400)).toBeGreaterThanOrEqual(4);
  });

  it('zero overlap uses full chunk size', () => {
    // ~2000 tokens, max 1000, overlap 0 => 2 chunks.
    expect(estimateChunks('x'.repeat(8000), 1000, 0)).toBe(2);
  });
});

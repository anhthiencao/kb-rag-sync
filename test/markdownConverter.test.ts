import { describe, expect, it } from 'vitest';
import { articleSlug, cleanHtml, toMarkdown } from '../src/scraper/markdownConverter.js';
import type { Article } from '../src/scraper/zendeskClient.js';

function article(bodyHtml: string): Article {
  return {
    id: 123,
    title: 'Add a YouTube Video',
    bodyHtml,
    htmlUrl: 'https://support.optisigns.com/hc/en-us/articles/123',
    updatedAt: '2024-01-01T00:00:00Z',
    locale: 'en-us',
  };
}

describe('markdownConverter', () => {
  it('strips nav and scripts', () => {
    const cleaned = cleanHtml(
      '<nav>menu home about</nav><script>evil()</script><p>real content</p>',
    );
    expect(cleaned).not.toContain('menu home about');
    expect(cleaned).not.toContain('evil()');
    expect(cleaned).toContain('real content');
  });

  it('strips elements by class hint', () => {
    const cleaned = cleanHtml('<div class="social-share">share me</div><p>keep this</p>');
    expect(cleaned).not.toContain('share me');
    expect(cleaned).toContain('keep this');
  });

  it('preserves headings, relative links and code blocks', () => {
    const md = toMarkdown(
      article(
        '<h2>Setup</h2><p>See <a href="/hc/en-us/articles/9">this guide</a>.</p>' +
          '<pre><code>echo hi</code></pre>',
      ),
    );
    expect(md).toContain('## Setup');
    expect(md).toContain('[this guide](/hc/en-us/articles/9)');
    expect(md).toContain('echo hi');
    expect(md).toContain('```');
  });

  it('prepends a metadata header with Article URL', () => {
    const md = toMarkdown(article('<p>body</p>'));
    expect(md.startsWith('# Add a YouTube Video')).toBe(true);
    expect(md).toContain('Article URL: https://support.optisigns.com/hc/en-us/articles/123');
    expect(md).toContain('Article ID: 123');
  });

  it('produces a stable, clean slug', () => {
    const a = article('<p>x</p>');
    expect(articleSlug(a)).toBe('123-add-a-youtube-video');
    expect(articleSlug(a)).toBe(articleSlug(a));
  });
});

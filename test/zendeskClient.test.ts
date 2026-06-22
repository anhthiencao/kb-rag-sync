import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';
import { ZendeskClient, type Article } from '../src/scraper/zendeskClient.js';

const BASE = 'https://support.optisigns.com';
const PATH = '/api/v2/help_center/en-us/articles.json';

function raw(id: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `Article ${id}`,
    body: `<p>body ${id}</p>`,
    html_url: `${BASE}/hc/en-us/articles/${id}`,
    updated_at: '2024-01-01T00:00:00Z',
    locale: 'en-us',
    draft: false,
    ...extra,
  };
}

afterEach(() => nock.cleanAll());

async function collect(client: ZendeskClient): Promise<Article[]> {
  const out: Article[] = [];
  for await (const a of client.iterArticles()) out.push(a);
  return out;
}

describe('ZendeskClient', () => {
  it('follows next_page pagination', async () => {
    const page2 = `${BASE}${PATH}?page=2`;
    nock(BASE)
      .get(PATH)
      .query({ per_page: '100' })
      .reply(200, { articles: [raw(1)], next_page: page2 });
    nock(BASE)
      .get(PATH)
      .query({ page: '2' })
      .reply(200, { articles: [raw(2)], next_page: null });

    const arts = await collect(new ZendeskClient(BASE, 'en-us'));
    expect(arts.map((a) => a.id)).toEqual([1, 2]);
    expect(arts[0].htmlUrl).toMatch(/\/articles\/1$/);
  });

  it('skips drafts', async () => {
    nock(BASE)
      .get(PATH)
      .query(true)
      .reply(200, { articles: [raw(1), raw(3, { draft: true })], next_page: null });

    const arts = await collect(new ZendeskClient(BASE, 'en-us'));
    expect(arts.map((a) => a.id)).toEqual([1]);
  });
});

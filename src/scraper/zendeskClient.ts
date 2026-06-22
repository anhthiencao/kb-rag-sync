/**
 * Fetch articles from the Zendesk Help Center public API.
 *
 * support.optisigns.com runs on Zendesk, whose Help Center API returns clean JSON
 * with `updated_at`, `html_url`, and pagination -- far more stable than scraping HTML.
 *
 * Endpoint: {base}/api/v2/help_center/{locale}/articles.json?page=N&per_page=100
 */
import axios, { type AxiosInstance } from 'axios';

export interface Article {
  id: number;
  title: string;
  bodyHtml: string;
  htmlUrl: string;
  updatedAt: string;
  locale: string;
}

interface RawArticle {
  id: number;
  title?: string;
  body?: string | null;
  html_url?: string;
  updated_at?: string;
  locale?: string;
  draft?: boolean;
}

interface ArticlesPage {
  articles: RawArticle[];
  next_page: string | null;
}

export class ZendeskClient {
  private readonly baseUrl: string;
  private readonly locale: string;
  private readonly perPage: number;
  private readonly http: AxiosInstance;

  constructor(baseUrl: string, locale = 'en-us', http?: AxiosInstance, perPage = 100) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.locale = locale;
    this.perPage = perPage;
    this.http =
      http ?? axios.create({ timeout: 30_000, headers: { 'User-Agent': 'optibot-scraper/1.0' } });
  }

  private articlesUrl(): string {
    return `${this.baseUrl}/api/v2/help_center/${this.locale}/articles.json`;
  }

  /** Yield every published article, following Zendesk pagination. */
  async *iterArticles(maxPages = 100): AsyncGenerator<Article> {
    let nextUrl: string | null = this.articlesUrl();
    let params: Record<string, number> | undefined = { per_page: this.perPage };
    let pages = 0;

    while (nextUrl !== null && pages < maxPages) {
      const resp = await this.http.get<ArticlesPage>(nextUrl, { params });
      const data: ArticlesPage = resp.data;
      for (const raw of data.articles ?? []) {
        if (raw.draft) continue;
        yield {
          id: raw.id,
          title: (raw.title ?? '').trim(),
          bodyHtml: raw.body ?? '',
          htmlUrl: raw.html_url ?? '',
          updatedAt: raw.updated_at ?? '',
          locale: raw.locale ?? this.locale,
        };
      }
      // next_page is an absolute URL or null; params only needed on the first call.
      nextUrl = data.next_page;
      params = undefined;
      pages += 1;
    }
  }
}

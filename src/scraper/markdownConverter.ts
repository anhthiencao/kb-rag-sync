/**
 * Convert a Zendesk article (HTML) into clean Markdown.
 *
 *   KEEP   headings, relative links, code blocks, lists, tables.
 *   STRIP  nav, scripts, styles, ads, share widgets, breadcrumbs.
 * Each file gets a metadata header so the Assistant can cite `Article URL:` lines.
 */
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import type { Article } from './zendeskClient.js';

const STRIP_TAGS = ['nav', 'script', 'style', 'noscript', 'iframe', 'form', 'header', 'footer'];
const STRIP_CLASS_HINTS = [
  'nav',
  'breadcrumb',
  'share',
  'social',
  'advert',
  'ad-',
  'cookie',
  'subscribe',
];

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndown.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);

function slugify(text: string, maxLen = 60): string {
  const s = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return s.slice(0, maxLen) || 'untitled';
}

/** Stable, collision-free filename stem: <id>-<title-slug>. */
export function articleSlug(article: Article): string {
  return `${article.id}-${slugify(article.title)}`;
}

export function cleanHtml(html: string): string {
  const $ = cheerio.load(html || '', null, false);
  $(STRIP_TAGS.join(',')).remove();
  $('[class]').each((_, el) => {
    const classes = ($(el).attr('class') ?? '').toLowerCase();
    if (STRIP_CLASS_HINTS.some((h) => classes.includes(h))) $(el).remove();
  });
  return $.html();
}

/** Render the full Markdown document (metadata header + body). */
export function toMarkdown(article: Article): string {
  let body = turndown.turndown(cleanHtml(article.bodyHtml)).trim();
  body = body.replace(/\n{3,}/g, '\n\n'); // collapse 3+ blank lines to 2

  const header =
    `# ${article.title}\n\n` + `Article URL: ${article.htmlUrl}\n` + `Article ID: ${article.id}\n`;
  return `${header}\n${body}\n`;
}

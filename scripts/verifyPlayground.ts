#!/usr/bin/env node
/**
 * Drive the OpenAI Assistants Playground in a real (headed) browser to capture the
 * deliverable screenshot: OptiBot answering the sample question with citations.
 *
 *   1. Launch headed Chromium with a persistent profile (.pwprofile, gitignored)
 *      so your OpenAI login is remembered across runs.
 *   2. Log in once in the opened window (first run only).
 *   3. The script auto-types the sample question; click Run in the window if needed.
 *   4. When a cited answer appears, it screenshots to docs/images/playground-answer.png.
 *
 * Requires: npm i (devDeps include playwright) + `npx playwright install chromium`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { loadConfig } from '../src/config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUESTION = 'How do I add a YouTube video?';
const SHOT = path.join(ROOT, 'docs', 'images', 'playground-answer.png');
const PROFILE = path.join(ROOT, '.pwprofile');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<number> {
  const cfg = loadConfig();
  let url = 'https://platform.openai.com/playground/assistants';
  if (cfg.assistantId) url += `?assistant=${cfg.assistantId}`;
  mkdirSync(path.dirname(SHOT), { recursive: true });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 1600 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  console.log(`Opening ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  console.log('>>> Log in to OpenAI if prompted. Waiting for the composer (up to 5 min)...');
  const composer = page.locator('textarea, [contenteditable="true"]').first();
  try {
    await composer.waitFor({ state: 'visible', timeout: 300_000 });
    await composer.click();
    await composer.fill(QUESTION).catch(() => composer.type(QUESTION));
    await page.keyboard.press('Enter');
    await page
      .getByRole('button', { name: /run|send/i })
      .first()
      .click({ timeout: 3000 })
      .catch(() => {});
    console.log(`Submitted question: ${QUESTION}`);
  } catch {
    console.log('Composer not found; type the question and click Run in the window.');
  }

  console.log('>>> Waiting up to 6 min for a cited answer (click Run in the window if needed)...');
  const deadline = Date.now() + 360_000;
  let found = false;
  while (Date.now() < deadline) {
    const text = await page
      .locator('body')
      .innerText()
      .catch(() => '');
    const cited = text.includes('Article URL:') || /\[\d+\]/.test(text);
    const answered = text.includes('OptiSigns') && text.includes('YouTube') && text.length > 1500;
    if (cited && answered) {
      found = true;
      break;
    }
    await sleep(3000);
  }

  await sleep(2000);
  await page.evaluate(() => {
    let best: Element | null = null;
    let bestH = 0;
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const s = el.scrollHeight;
      const c = el.clientHeight;
      if (s > c + 50 && s > bestH && c > 200) {
        bestH = s;
        best = el;
      }
    }
    if (best) best.scrollTop = 0;
  });
  await sleep(1000);

  const out = found ? SHOT : SHOT.replace('.png', '.debug.png');
  await page.screenshot({ path: out, fullPage: true });
  console.log(`Screenshot saved -> ${out}`);
  if (!found)
    console.log(
      'NOTE: no cited answer detected; saved debug image, kept previous screenshot intact.',
    );
  await ctx.close();
  return found ? 0 : 2;
}

main().then((code) => process.exit(code));

#!/usr/bin/env node
/**
 * Constraint gate -- single source of truth for "done or not".
 *
 *   (no args)   Human report. Exit 0 if all REQUIRED checks pass, else 1. (CI + skill)
 *   --json      Machine-readable JSON report (same exit codes).
 *   --summary   One-line status (SessionStart context). Exit 0 always.
 *   --gate      Stop-hook mode: consecutive-failure counter with a safety valve
 *               (max 3 blocks), emits Stop-hook JSON, exit 0 always.
 *
 * Node built-ins only.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ATTEMPTS_FILE = path.join(ROOT, '.claude', '.gate_attempts');
const MAX_BLOCKS = 3;
const SECRET_RE = /sk-(proj-)?[A-Za-z0-9_-]{20,}/g;
const PLACEHOLDER = ['your', 'xxx', 'example', 'changeme', 'placeholder'];

function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

function mdCount() {
  const d = path.join(ROOT, 'data', 'articles');
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.md')).length : 0;
}

function checkArticles() {
  const n = mdCount();
  return ['articles>=30', true, n >= 30, `${n} Markdown files in data/articles/ (need >=30)`];
}

function checkNoSecrets() {
  const hits = [];
  for (const f of [
    ...walk(path.join(ROOT, 'src'), ['.ts', '.js']),
    ...walk(path.join(ROOT, 'scripts'), ['.ts', '.js', '.mjs']),
  ]) {
    const text = readFileSync(f, 'utf-8');
    for (const m of text.match(SECRET_RE) ?? []) {
      if (PLACEHOLDER.some((h) => m.toLowerCase().includes(h))) continue;
      hits.push(`${path.relative(ROOT, f)}: ${m.slice(0, 12)}...`);
    }
  }
  return [
    'no-hardcoded-secrets',
    true,
    hits.length === 0,
    hits.length ? `Keys found: ${hits.join('; ')}` : 'No hard-coded API keys',
  ];
}

function fileCheck(name, rel, msgOk, msgNo) {
  return [
    name,
    true,
    existsSync(path.join(ROOT, rel)),
    existsSync(path.join(ROOT, rel)) ? msgOk : msgNo,
  ];
}

function checkEnvGitignored() {
  const gi = path.join(ROOT, '.gitignore');
  const ok =
    existsSync(gi) &&
    readFileSync(gi, 'utf-8')
      .split('\n')
      .some((l) => ['.env', '*.env', '.env*'].includes(l.trim()));
  return ['.env-gitignored', true, ok, ok ? '.env is gitignored' : '.env not gitignored'];
}

function checkManifest() {
  const m = path.join(ROOT, 'data', 'manifest.json');
  if (!existsSync(m))
    return ['manifest-json-valid', false, true, 'manifest.json not created yet (skipped)'];
  try {
    JSON.parse(readFileSync(m, 'utf-8'));
    return ['manifest-json-valid', false, true, 'manifest.json is valid'];
  } catch (e) {
    return ['manifest-json-valid', true, false, `manifest.json broken: ${e}`];
  }
}

function checkTests() {
  const hasTests = walk(path.join(ROOT, 'test'), ['.test.ts']).length > 0;
  if (!hasTests) return ['tests', false, true, 'No tests yet (skipped)'];
  try {
    execSync('npm test --silent', { cwd: ROOT, stdio: 'pipe', timeout: 300_000 });
    return ['tests', true, true, 'Tests pass (vitest)'];
  } catch {
    return ['tests', true, false, 'Tests FAIL (npm test)'];
  }
}

function checkRepoName() {
  let url = '';
  try {
    url = execSync('git remote get-url origin', { cwd: ROOT, stdio: 'pipe' })
      .toString()
      .trim()
      .toLowerCase();
  } catch {
    /* no remote */
  }
  const target = url || path.basename(ROOT).toLowerCase();
  const ok = !target.includes('optisigns');
  return [
    'repo-name-cryptic',
    false,
    ok,
    ok
      ? "Repo name does not contain 'optisigns'"
      : "WARN: repo/remote name contains 'optisigns' -- rename to something cryptic",
  ];
}

function runAll() {
  const results = [
    checkArticles(),
    checkNoSecrets(),
    fileCheck('.env.sample', '.env.sample', '.env.sample present', 'Missing .env.sample'),
    checkEnvGitignored(),
    fileCheck('Dockerfile', 'Dockerfile', 'Dockerfile present', 'Missing Dockerfile'),
    fileCheck('README.md', 'README.md', 'README.md present', 'Missing README.md'),
    checkManifest(),
    checkTests(),
    checkRepoName(),
  ];
  const requiredFail = results.filter((r) => r[1] && !r[2]);
  return { results, requiredFail, passed: requiredFail.length === 0 };
}

function report({ results, requiredFail, passed }) {
  const lines = ['', '=== CONSTRAINT GATE ==='];
  for (const [name, required, ok, msg] of results) {
    const icon = ok ? '[OK]' : required ? '[FAIL]' : '[WARN]';
    lines.push(`  ${icon} ${name}${required ? '' : ' (warn)'}: ${msg}`);
  }
  lines.push('-'.repeat(23));
  lines.push(
    passed
      ? 'RESULT: PASS -- all required constraints satisfied.'
      : `RESULT: FAIL -- ${requiredFail.length} required constraint(s) unmet.`,
  );
  return lines.join('\n');
}

const mode = process.argv[2] ?? '';
const state = runAll();

if (mode === '--summary') {
  const status = state.passed ? 'PASS' : `FAIL (${state.requiredFail.length} unmet)`;
  const flags = state.results
    .filter((r) => r[1])
    .map((r) => `${r[0]}=${r[2] ? 'ok' : 'x'}`)
    .join(', ');
  process.stdout.write(`[gate] ${status} | articles=${mdCount()} | ${flags}\n`);
  process.exit(0);
}

if (mode === '--json') {
  process.stdout.write(
    JSON.stringify(
      {
        passed: state.passed,
        checks: state.results.map(([name, required, ok, message]) => ({
          name,
          required,
          ok,
          message,
        })),
      },
      null,
      2,
    ) + '\n',
  );
  process.exit(state.passed ? 0 : 1);
}

if (mode === '--gate') {
  if (state.passed) {
    if (existsSync(ATTEMPTS_FILE)) rmSync(ATTEMPTS_FILE);
    process.stdout.write(
      JSON.stringify({ systemMessage: 'Constraint gate: all constraints satisfied.' }) + '\n',
    );
    process.exit(0);
  }
  let attempts = 0;
  if (existsSync(ATTEMPTS_FILE))
    attempts = parseInt(readFileSync(ATTEMPTS_FILE, 'utf-8').trim() || '0', 10) || 0;
  attempts += 1;
  if (attempts >= MAX_BLOCKS) {
    if (existsSync(ATTEMPTS_FILE)) rmSync(ATTEMPTS_FILE);
    const unmet = state.requiredFail.map((r) => r[0]).join(', ');
    process.stdout.write(
      JSON.stringify({
        systemMessage: `Constraint gate still FAILING after ${MAX_BLOCKS} attempts -- allowing stop. Unmet: ${unmet}.`,
      }) + '\n',
    );
    process.exit(0);
  }
  writeFileSync(ATTEMPTS_FILE, String(attempts));
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason:
        report(state) +
        `\n\n(attempt ${attempts}/${MAX_BLOCKS}) Fix the [FAIL] items above before finishing.`,
    }) + '\n',
  );
  process.exit(0);
}

process.stdout.write(report(state) + '\n');
process.exit(state.passed ? 0 : 1);

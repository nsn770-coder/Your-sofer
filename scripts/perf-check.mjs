#!/usr/bin/env node
/**
 * perf-check.mjs — run AFTER `npm run build` to catch performance regressions.
 *
 *   node scripts/perf-check.mjs
 *
 * Checks:
 *  1. Prerendered HTML actually contains the page content (guards against the
 *     useSearchParams()-inside-root-Suspense bug that shipped EMPTY HTML on every
 *     page and caused LCP ~5s / CLS ~1.9 — fixed 2026-07-08 in ShaliachContext).
 *  2. No single JS chunk above budget.
 *  3. Homepage HTML preloads the hero poster and doesn't preload dead images.
 * Exit code 1 on any failure — safe to wire into CI.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const CHUNK_BUDGET_KB = 400; // uncompressed, per chunk
let failed = false;
const fail = (msg) => { failed = true; console.error('  ✗ ' + msg); };
const ok = (msg) => console.log('  ✓ ' + msg);

// ── 1. Prerendered homepage must contain real content ────────────────────────
console.log('\n[1] Prerendered HTML content');
const indexHtml = join(ROOT, '.next', 'server', 'app', 'index.html');
if (!existsSync(indexHtml)) {
  fail('.next/server/app/index.html not found — run `npm run build` first');
} else {
  const html = readFileSync(indexHtml, 'utf8');
  // Static markers that must exist in the HTML before any JS runs:
  const markers = [
    ['hero title', 'כל עולם היודאיקה'],
    ['trust row', 'משלוחים לכל הארץ'],
    ['category grid heading', 'קטגוריות נבחרות'],
  ];
  for (const [label, text] of markers) {
    if (html.includes(text)) ok(`${label} present in static HTML`);
    else fail(`${label} MISSING from static HTML — page is client-rendered again! ` +
              'Check for useSearchParams() inside the root layout Suspense boundary.');
  }
  if (html.includes('rel="preload" as="image"') && html.includes('w_1080')) {
    ok('hero poster preload present');
  } else {
    fail('hero poster preload missing from homepage HTML');
  }
  if (html.includes('%D7%91%D7%90%D7%A0%D7%A8_2_wovsve')) {
    fail('stale banner preload (באנר_2_wovsve.png) is back — remove it, the image is unused');
  } else {
    ok('no stale banner preload');
  }
}

// ── 2. Chunk size budget ─────────────────────────────────────────────────────
console.log('\n[2] JS chunk sizes (budget: ' + CHUNK_BUDGET_KB + ' KB/chunk, uncompressed)');
const chunksDir = join(ROOT, '.next', 'static', 'chunks');
if (!existsSync(chunksDir)) {
  fail('.next/static/chunks not found');
} else {
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : (f.endsWith('.js') ? [p] : []);
  });
  const chunks = walk(chunksDir)
    .map((p) => ({ p: p.replace(ROOT, ''), kb: Math.round(statSync(p).size / 1024) }))
    .sort((a, b) => b.kb - a.kb);
  const total = chunks.reduce((s, c) => s + c.kb, 0);
  console.log(`  total: ${chunks.length} chunks, ${total} KB`);
  for (const c of chunks.slice(0, 8)) console.log(`    ${String(c.kb).padStart(5)} KB  ${c.p}`);
  const over = chunks.filter((c) => c.kb > CHUNK_BUDGET_KB);
  if (over.length) fail(`${over.length} chunk(s) over ${CHUNK_BUDGET_KB} KB`);
  else ok('all chunks within budget');
}

console.log(failed ? '\nperf-check: FAILED\n' : '\nperf-check: all good\n');
process.exit(failed ? 1 : 0);

// Minimal bidi reordering for logo text (Hebrew / Latin / digits).
//
// opentype.js lays glyphs left-to-right and has no bidi support. Unpointed
// Hebrew needs no contextual shaping (final forms are separate code points), so
// correct rendering only needs VISUAL ORDER. This implements the subset of the
// Unicode Bidi Algorithm that logo text can contain: strong R (Hebrew), strong
// L (Latin), European numbers with their separators, and neutrals.
//
// Returns visual runs left→right, each with its characters already in visual
// order, plus the direction (used to decide where kerning applies).

export type Dir = 'L' | 'R';
export interface VisualRun { text: string; dir: Dir }

type Cls = 'R' | 'L' | 'EN' | 'CS' | 'WS' | 'ON';

const isHebrew = (c: string) => /[֐-׿יִ-ﭏ]/.test(c);
const isLatin = (c: string) => /[A-Za-zÀ-ɏ]/.test(c);
const isDigit = (c: string) => /[0-9]/.test(c);

function classify(c: string): Cls {
  if (isHebrew(c)) return 'R';
  if (isLatin(c)) return 'L';
  if (isDigit(c)) return 'EN';
  if (/[.,:/\-]/.test(c)) return 'CS';
  if (/\s/.test(c)) return 'WS';
  return 'ON';
}

const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '<': '>', '>': '<', '{': '}', '}': '{' };

export function baseDirection(text: string): Dir {
  for (const c of text) {
    if (isHebrew(c)) return 'R';
    if (isLatin(c)) return 'L';
  }
  return 'L';
}

/** Resolve each character to an embedding level (0 = LTR, 1 = RTL, 2 = LTR inside RTL). */
export function resolveLevels(chars: string[], base: Dir): number[] {
  const cls = chars.map(classify);
  // Separators between digits join the number ("12.03.2027", "10:30").
  for (let i = 1; i < cls.length - 1; i++) {
    if (cls[i] === 'CS' && cls[i - 1] === 'EN' && cls[i + 1] === 'EN') cls[i] = 'EN';
  }
  // For neutral resolution (UBA N1) numbers behave like R inside RTL text.
  const strongAt = (i: number): Dir | null => {
    const c = cls[i];
    if (c === 'R') return 'R';
    if (c === 'L') return 'L';
    if (c === 'EN') return base === 'R' ? 'R' : 'L';
    return null;
  };
  const levels: number[] = new Array(chars.length);
  const baseLevel = base === 'R' ? 1 : 0;
  const ltrLevel = baseLevel === 1 ? 2 : 0;
  for (let i = 0; i < chars.length; i++) {
    const c = cls[i];
    if (c === 'R') { levels[i] = 1; continue; }
    if (c === 'L' || c === 'EN') { levels[i] = ltrLevel; continue; }
    let p: Dir | null = null, n: Dir | null = null;
    for (let j = i - 1; j >= 0 && !p; j--) p = strongAt(j);
    for (let j = i + 1; j < chars.length && !n; j++) n = strongAt(j);
    // Neutral between digits and letters of the same embedding stays with them.
    const d: Dir = p && n && p === n ? p : base;
    // A neutral inside a number/latin run in RTL text (both sides LTR) stays LTR.
    const leftL = i > 0 && (cls[i - 1] === 'L' || cls[i - 1] === 'EN');
    const rightL = i < chars.length - 1 && (cls[i + 1] === 'L' || cls[i + 1] === 'EN');
    if (base === 'R' && leftL && rightL && cls[i - 1] === 'L' && cls[i + 1] === 'L') { levels[i] = ltrLevel; continue; }
    levels[i] = d === 'R' ? 1 : ltrLevel;
  }
  return levels;
}

/** Reorder a single line into visual runs (left → right). */
export function toVisualRuns(text: string): VisualRun[] {
  const chars = Array.from(text);
  if (chars.length === 0) return [];
  const base = baseDirection(text);
  const levels = resolveLevels(chars, base);

  // L2: reverse from the highest level down to the lowest odd level.
  const order = chars.map((_, i) => i);
  const maxLevel = Math.max(...levels);
  for (let lvl = maxLevel; lvl >= 1; lvl--) {
    let i = 0;
    while (i < order.length) {
      if (levels[order[i]] >= lvl) {
        let j = i;
        while (j < order.length && levels[order[j]] >= lvl) j++;
        const seg = order.slice(i, j).reverse();
        order.splice(i, j - i, ...seg);
        i = j;
      } else i++;
    }
  }

  // Group consecutive same-direction chars into runs; mirror brackets in RTL.
  const runs: VisualRun[] = [];
  for (const idx of order) {
    const dir: Dir = levels[idx] % 2 === 1 ? 'R' : 'L';
    let ch = chars[idx];
    if (dir === 'R' && MIRROR[ch]) ch = MIRROR[ch];
    const last = runs[runs.length - 1];
    if (last && last.dir === dir) last.text += ch;
    else runs.push({ text: ch, dir });
  }
  return runs;
}

/** Convenience: the full line in visual order as one string. */
export function toVisualString(text: string): string {
  return toVisualRuns(text).map(r => r.text).join('');
}

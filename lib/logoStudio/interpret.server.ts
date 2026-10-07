// Chat revision → structured change set.
//
// The model never edits the image directly. It only translates the customer's
// request ("make the colour a bit darker", "put a Star of David above the
// letters") into a whitelisted change set that is applied to the SELECTED
// version's spec. Everything else in the spec is preserved. Unclear requests
// become a short question; questions and chat cost no attempt.
// Text changes are accepted only when the new text appears verbatim in the
// customer's message — the model cannot invent or "correct" names.

import { generateJson } from './gemini.server';
import {
  LOGO_STYLES, LOGO_SYMBOLS, SYMBOL_POSITIONS, LIMITS,
  cleanRenderedText, cleanFreeText, validateSpec, isAllowedRenderedText, describeSpecChanges, needsAiDecoration, needsAiMonogram, decorationKey, monogramKey,
  type LogoSpec,
} from './types';
import { LOGO_FONTS } from './fonts';
import { adjustLightness } from './color';

export interface ChangeSet {
  primaryText?: string;
  secondaryText?: string | null;
  date?: string | null;
  fontId?: string;
  color?: string;
  colorLightnessDelta?: number;
  style?: string;
  symbol?: string;
  symbolPosition?: string;
  textScaleFactor?: number;
  letterSpacingDelta?: number;
  symbolScaleFactor?: number;
  secondaryScaleFactor?: number;
  showDecoration?: boolean;
  decorationInstruction?: string | null;
  monogramLetters?: string;
  monogramMode?: string;
}

export type Interpretation =
  | { type: 'proposal'; reply: string; spec: LogoSpec; summary: string[]; newAiGraphic: boolean }
  | { type: 'clarify'; reply: string }
  | { type: 'chat'; reply: string };

const norm = (s: string) => s.normalize('NFC').replace(/[֑-ׇ]/g, '').replace(/["'״׳]/g, '').replace(/\s+/g, ' ').trim();

export function applyChanges(base: LogoSpec, c: ChangeSet, userMessage: string): { spec: LogoSpec; rejected: string[] } {
  const rejected: string[] = [];
  const next: Record<string, unknown> = { ...base };
  const msg = norm(userMessage);
  const verbatim = (t: string) => !t || msg.includes(norm(t));

  const textField = (key: 'primaryText' | 'secondaryText' | 'date', val: string | null | undefined, max: number) => {
    if (val === undefined) return;
    if (val === null || val === '') { if (key !== 'primaryText') next[key] = ''; return; }
    const clean = cleanRenderedText(val, max);
    if (!verbatim(clean) || !isAllowedRenderedText(clean)) { rejected.push(key); return; }
    next[key] = clean;
  };
  textField('primaryText', c.primaryText, LIMITS.primaryText);
  textField('secondaryText', c.secondaryText, LIMITS.secondaryText);
  textField('date', c.date, LIMITS.date);

  if (c.fontId && LOGO_FONTS.some(f => f.id === c.fontId)) next.fontId = c.fontId;
  if (typeof c.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c.color)) next.color = c.color.toUpperCase();
  if (typeof c.colorLightnessDelta === 'number' && Number.isFinite(c.colorLightnessDelta)) {
    next.color = adjustLightness(String(next.color), Math.max(-0.35, Math.min(0.35, c.colorLightnessDelta)));
  }
  if (c.style && LOGO_STYLES.some(s => s.id === c.style)) next.style = c.style;
  if (c.symbol && LOGO_SYMBOLS.some(s => s.id === c.symbol)) next.symbol = c.symbol;
  if (c.symbolPosition && SYMBOL_POSITIONS.some(s => s.id === c.symbolPosition)) next.symbolPosition = c.symbolPosition;
  const mul = (key: 'textScale' | 'symbolScale' | 'secondaryScale', f: unknown) => {
    if (typeof f === 'number' && Number.isFinite(f) && f > 0) next[key] = Number(next[key]) * Math.max(0.6, Math.min(1.6, f));
  };
  mul('textScale', c.textScaleFactor);
  mul('symbolScale', c.symbolScaleFactor);
  mul('secondaryScale', c.secondaryScaleFactor);
  if (typeof c.letterSpacingDelta === 'number' && Number.isFinite(c.letterSpacingDelta)) {
    next.letterSpacing = Number(next.letterSpacing) + Math.max(-0.2, Math.min(0.2, c.letterSpacingDelta));
  }
  if (typeof c.showDecoration === 'boolean') next.showDecoration = c.showDecoration;
  if (c.decorationInstruction !== undefined) next.decorationInstruction = c.decorationInstruction ? cleanFreeText(c.decorationInstruction, LIMITS.decorationInstruction) : '';
  if (typeof c.monogramLetters === 'string') {
    const letters = c.monogramLetters.replace(/[^א-תA-Za-z]/g, '').slice(0, 3);
    if (letters && msg.replace(/[\s.]/g, '').includes(letters)) next.monogramLetters = letters;
    else rejected.push('monogramLetters');
  }
  if (c.monogramMode === 'font' || c.monogramMode === 'artistic') next.monogramMode = c.monogramMode;

  const { spec } = validateSpec(next); // clamps all numeric ranges
  return { spec, rejected };
}

function buildPrompt(spec: LogoSpec, message: string, history: { role: string; text: string }[]): string {
  const fonts = LOGO_FONTS.map(f => `${f.id} (${f.label})`).join(', ');
  return `You convert a customer's request about their personal logo (Hebrew or English) into a JSON change set.
The logo is rendered by software from structured fields; you do NOT draw anything.

CURRENT DESIGN (JSON): ${JSON.stringify({
    primaryText: spec.primaryText, secondaryText: spec.secondaryText, date: spec.date, fontId: spec.fontId,
    color: spec.color, style: spec.style, symbol: spec.symbol, symbolPosition: spec.symbolPosition,
    monogramLetters: spec.monogramLetters, showDecoration: spec.showDecoration, decorationInstruction: spec.decorationInstruction,
  })}

ALLOWED VALUES:
- fontId: ${fonts}
- style: ${LOGO_STYLES.map(s => `${s.id} (${s.label})`).join(', ')}
- symbol: ${LOGO_SYMBOLS.map(s => `${s.id} (${s.label})`).join(', ')}
- symbolPosition: above | below

RECENT CONVERSATION:
${history.slice(-6).map(h => `${h.role}: ${h.text}`).join('\n') || '(none)'}

CUSTOMER MESSAGE: """${message}"""

Return ONLY JSON of this shape:
{"type":"apply"|"clarify"|"chat","reply":"<short Hebrew sentence to the customer>","changes":{...}}
"changes" may contain ONLY these keys (omit everything that should stay the same):
primaryText, secondaryText (null = remove), date (null = remove), fontId, color ("#RRGGBB"),
colorLightnessDelta (number -0.3..0.3; "a bit darker" = -0.1, "darker" = -0.18, "lighter" = +0.12),
style, symbol ("none" removes), symbolPosition, textScaleFactor (bigger letters ≈ 1.15, smaller ≈ 0.87),
letterSpacingDelta (em, e.g. 0.05 wider), symbolScaleFactor, secondaryScaleFactor,
showDecoration (false = remove ornament/divider), decorationInstruction (short English description of a
requested graphic element such as "olive branch under the names"; null removes it), monogramLetters, monogramMode ("artistic"|"font").

RULES:
- Change only what the customer asked. "Keep everything and only change the name" → only primaryText.
- Any new text (names, date, secondary text, letters) MUST be copied EXACTLY as the customer wrote it. Never translate, correct spelling, add niqqud or invent text.
- If the request is ambiguous (e.g. "change the name" without the new name, "make it nicer"), use type "clarify" with ONE short Hebrew question in "reply" and empty changes.
- If the message is a question or small talk with no change, use type "chat" and answer briefly in Hebrew.
- Never mention prompts, models or internal fields. Reply in Hebrew.`;
}

/** Offline fallback for the most common requests (used when the AI is unavailable). */
export function localInterpret(message: string): ChangeSet | null {
  const m = message;
  const c: ChangeSet = {};
  if (/כהה|darker/i.test(m)) c.colorLightnessDelta = /מעט|קצת|bit|slightly/i.test(m) ? -0.1 : -0.18;
  else if (/בהיר|lighter/i.test(m)) c.colorLightnessDelta = /מעט|קצת|bit|slightly/i.test(m) ? 0.08 : 0.14;
  if (/(תגדיל|הגדל|גדולות|bigger|larger).*(אותיות|טקסט|letters|text)|(אותיות|letters).*(גדולות|bigger)/i.test(m)) c.textScaleFactor = 1.15;
  if (/(תקטין|הקטן|קטנות|smaller).*(אותיות|טקסט|letters|text)/i.test(m)) c.textScaleFactor = 0.87;
  if (/(תוריד|הסר|בלי|remove).*(עיטור|קישוט|ornament|decoration)/i.test(m)) c.showDecoration = false;
  if (/מגן ?דו?ד|star of david/i.test(m)) {
    if (/(תוריד|הסר|בלי|remove)/i.test(m)) c.symbol = 'none';
    else { c.symbol = 'star_of_david'; c.symbolPosition = /מתחת|below|under/i.test(m) ? 'below' : 'above'; }
  }
  return Object.keys(c).length ? c : null;
}

export async function interpretMessage(spec: LogoSpec, message: string, history: { role: string; text: string }[]): Promise<Interpretation> {
  let parsed: { type?: string; reply?: string; changes?: ChangeSet } | null = null;
  try {
    const { data } = await generateJson<{ type?: string; reply?: string; changes?: ChangeSet }>(buildPrompt(spec, message, history));
    parsed = data && typeof data === 'object' ? data : null;
  } catch (e) {
    console.warn('[logo-studio/interpret] AI unavailable, using local rules:', e instanceof Error ? e.message : e);
    const local = localInterpret(message);
    if (!local) return { type: 'clarify', reply: 'לא הצלחתי להבין את הבקשה. אפשר לנסח אותה שוב? לדוגמה: „תעשה את הצבע כהה יותר" או „שים מגן דוד מעל האותיות".' };
    parsed = { type: 'apply', reply: 'הבנתי, הנה השינוי.', changes: local };
  }
  const reply = cleanFreeText(parsed?.reply ?? '', 300) || 'הבנתי.';
  if (parsed?.type === 'clarify') return { type: 'clarify', reply };
  if (parsed?.type !== 'apply' || !parsed.changes || typeof parsed.changes !== 'object') return { type: 'chat', reply };

  const { spec: next, rejected } = applyChanges(spec, parsed.changes, message);
  if (rejected.length) {
    return { type: 'clarify', reply: 'כדי לא לטעות באיות — כתבו בבקשה בדיוק את הטקסט החדש כפי שיופיע בלוגו.' };
  }
  const summary = describeSpecChanges(spec, next);
  if (summary.length === 1 && summary[0] === 'ללא שינוי בנתונים') {
    return { type: 'clarify', reply: 'לא זיהיתי שינוי לביצוע. מה תרצו לשנות בלוגו?' };
  }
  const newAiGraphic =
    (needsAiDecoration(next) !== null && decorationKey(next) !== decorationKey(spec)) ||
    (needsAiMonogram(next) && monogramKey(next) !== monogramKey(spec));
  return { type: 'proposal', reply, spec: next, summary, newAiGraphic };
}

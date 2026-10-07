// ─────────────────────────────────────────────────────────────────────────────
// Logo Studio — shared types, option lists and validation.
// Imported by both the client (/logo-studio) and the API routes. No Node-only
// imports here.
//
// Design principle: everything the customer chooses is stored as STRUCTURED
// data (LogoSpec). The renderer works from the spec — never from a free-form
// prompt. Free text (notes / chat) is only used to steer optional AI graphics
// (ornament / artistic monogram), never the letters themselves.
// ─────────────────────────────────────────────────────────────────────────────

import { LOGO_FONTS, type LogoFontId } from './fonts';

export const LOGO_STYLES = [
  { id: 'classic',  label: 'קלאסי',          hint: 'אותיות סריף ופס עיטור עדין' },
  { id: 'elegant',  label: 'אלגנטי',         hint: 'מרווח אותיות רחב וקווים דקים' },
  { id: 'modern',   label: 'מודרני',         hint: 'אותיות נקיות ובולטות' },
  { id: 'minimal',  label: 'מינימליסטי',     hint: 'טקסט בלבד, הרבה אוויר' },
  { id: 'monogram', label: 'אותיות משולבות', hint: 'מונוגרמה אמנותית של ראשי התיבות' },
  { id: 'ornament', label: 'עיטור',          hint: 'מסגרת או זר מעוטר סביב הטקסט' },
] as const;
export type LogoStyleId = typeof LOGO_STYLES[number]['id'];

export const LOGO_EVENTS = [
  { id: 'bar_mitzvah', label: 'בר מצווה' },
  { id: 'bat_mitzvah', label: 'בת מצווה' },
  { id: 'wedding',     label: 'חתונה' },
  { id: 'brit',        label: 'ברית / בריתה' },
  { id: 'upsherin',    label: 'חלאקה' },
  { id: 'other',       label: 'אירוע אחר' },
] as const;
export type LogoEventId = typeof LOGO_EVENTS[number]['id'];

export const LOGO_SYMBOLS = [
  { id: 'none',          label: 'ללא סמל' },
  { id: 'star_of_david', label: 'מגן דוד' },
  { id: 'crown',         label: 'כתר' },
  { id: 'rings',         label: 'טבעות' },
  { id: 'heart',         label: 'לב' },
  { id: 'tablets',       label: 'לוחות הברית' },
] as const;
export type LogoSymbolId = typeof LOGO_SYMBOLS[number]['id'];

export const SYMBOL_POSITIONS = [
  { id: 'above', label: 'מעל הטקסט' },
  { id: 'below', label: 'מתחת לטקסט' },
] as const;
export type SymbolPosition = typeof SYMBOL_POSITIONS[number]['id'];

export const PRESET_COLORS: { hex: string; name: string }[] = [
  { hex: '#1F2A44', name: 'כחול לילה' },
  { hex: '#000000', name: 'שחור' },
  { hex: '#B08D2E', name: 'זהב' },
  { hex: '#8C8C8C', name: 'כסף' },
  { hex: '#FFFFFF', name: 'לבן' },
  { hex: '#51285F', name: 'סגול' },
  { hex: '#1E5AA8', name: 'כחול' },
  { hex: '#7FB3D5', name: 'תכלת' },
  { hex: '#2F5D3A', name: 'ירוק' },
  { hex: '#7A1F2B', name: 'בורדו' },
  { hex: '#C2185B', name: 'ורוד' },
  { hex: '#6B4A2B', name: 'חום' },
];

export type MonogramMode = 'artistic' | 'font';

/** All customer choices — the single source of truth for rendering. */
export interface LogoSpec {
  /** Names / initials / personal text — rendered EXACTLY in the chosen font. */
  primaryText: string;
  secondaryText: string;
  date: string;
  eventType: LogoEventId;
  fontId: LogoFontId;
  /** Main colour (hex #RRGGBB). Used for text, symbol and AI graphics. */
  color: string;
  style: LogoStyleId;
  symbol: LogoSymbolId;
  symbolPosition: SymbolPosition;
  /** Letters for the monogram style (1–3). Empty = derived from primaryText. */
  monogramLetters: string;
  monogramMode: MonogramMode;
  /** Free notes — only steer AI graphics, never the letters. */
  notes: string;
  /** Uploaded inspiration image (project-owned asset id) — optional. */
  inspirationAssetId: string | null;
  // ── fine tuning (changed by chat revisions) ──
  textScale: number;       // 0.6 – 1.6
  letterSpacing: number;   // em, -0.05 – 0.4
  secondaryScale: number;  // 0.6 – 1.4
  symbolScale: number;     // 0.5 – 1.8
  decorationScale: number; // 0.6 – 1.4
  /** false = the customer asked to remove the ornament / divider. */
  showDecoration: boolean;
  /** Extra instruction for the AI ornament (from chat), sanitised. */
  decorationInstruction: string;
}

export const DEFAULT_SPEC: LogoSpec = {
  primaryText: '',
  secondaryText: '',
  date: '',
  eventType: 'bar_mitzvah',
  fontId: 'david',
  color: '#1F2A44',
  style: 'classic',
  symbol: 'none',
  symbolPosition: 'above',
  monogramLetters: '',
  monogramMode: 'artistic',
  notes: '',
  inspirationAssetId: null,
  textScale: 1,
  letterSpacing: 0,
  secondaryScale: 1,
  symbolScale: 1,
  decorationScale: 1,
  showDecoration: true,
  decorationInstruction: '',
};

export const LIMITS = {
  primaryText: 40,
  secondaryText: 50,
  date: 30,
  notes: 300,
  monogramLetters: 3,
  decorationInstruction: 200,
  chatMessage: 400,
} as const;

/** Hebrew niqqud / cantillation — removed: our renderer does not position marks. */
const COMBINING_HEBREW = /[֑-ׇ]/g;
/** Allowed characters in rendered text: Hebrew, Latin, digits, common punctuation. */
const ALLOWED_TEXT = /^[א-תװ-״A-Za-z0-9 .,'"\-&/:()+!?״׳]*$/;

export function cleanRenderedText(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFC')
    .replace(COMBINING_HEBREW, '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '') // bidi controls
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function isAllowedRenderedText(s: string): boolean {
  return ALLOWED_TEXT.test(s);
}

/** Notes / instructions: plain text, no control chars, bounded. */
export function cleanFreeText(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').replace(/[\u0000-\u001F\u007F<>{}`$\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const clamp = (n: unknown, lo: number, hi: number, def: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : def;
  return Math.min(hi, Math.max(lo, v));
};

const oneOf = <T extends string>(v: unknown, list: readonly { id: T }[], def: T): T =>
  (typeof v === 'string' && list.some(x => x.id === v) ? v : def) as T;

export interface SpecValidation {
  spec: LogoSpec;
  errors: string[];
}

/**
 * Normalises untrusted input into a safe LogoSpec and reports blocking errors
 * in Hebrew. Never throws.
 */
export function validateSpec(input: unknown): SpecValidation {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const errors: string[] = [];

  const primaryText = cleanRenderedText(raw.primaryText, LIMITS.primaryText);
  const secondaryText = cleanRenderedText(raw.secondaryText, LIMITS.secondaryText);
  const date = cleanRenderedText(raw.date, LIMITS.date);
  const monogramLetters = cleanRenderedText(raw.monogramLetters, 10).replace(/[^א-תA-Za-z]/g, '').slice(0, LIMITS.monogramLetters);

  const fontId = (typeof raw.fontId === 'string' && LOGO_FONTS.some(f => f.id === raw.fontId) ? raw.fontId : DEFAULT_SPEC.fontId) as LogoFontId;
  const color = typeof raw.color === 'string' && HEX_RE.test(raw.color) ? raw.color.toUpperCase() : DEFAULT_SPEC.color;
  const style = oneOf(raw.style, LOGO_STYLES, DEFAULT_SPEC.style);

  const spec: LogoSpec = {
    primaryText,
    secondaryText,
    date,
    eventType: oneOf(raw.eventType, LOGO_EVENTS, DEFAULT_SPEC.eventType),
    fontId,
    color,
    style,
    symbol: oneOf(raw.symbol, LOGO_SYMBOLS, 'none'),
    symbolPosition: oneOf(raw.symbolPosition, SYMBOL_POSITIONS, 'above'),
    monogramLetters,
    monogramMode: raw.monogramMode === 'font' ? 'font' : 'artistic',
    notes: cleanFreeText(raw.notes, LIMITS.notes),
    inspirationAssetId: typeof raw.inspirationAssetId === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(raw.inspirationAssetId) ? raw.inspirationAssetId : null,
    textScale: clamp(raw.textScale, 0.6, 1.6, 1),
    letterSpacing: clamp(raw.letterSpacing, -0.05, 0.4, 0),
    secondaryScale: clamp(raw.secondaryScale, 0.6, 1.4, 1),
    symbolScale: clamp(raw.symbolScale, 0.5, 1.8, 1),
    decorationScale: clamp(raw.decorationScale, 0.6, 1.4, 1),
    showDecoration: raw.showDecoration !== false,
    decorationInstruction: cleanFreeText(raw.decorationInstruction, LIMITS.decorationInstruction),
  };

  for (const [label, val] of [['הטקסט הראשי', spec.primaryText], ['הטקסט המשני', spec.secondaryText], ['התאריך', spec.date]] as const) {
    if (val && !isAllowedRenderedText(val)) errors.push(`${label} מכיל תווים שאינם נתמכים. אפשר להשתמש באותיות עבריות או אנגליות, ספרות וסימני פיסוק בסיסיים.`);
  }
  if (style === 'monogram') {
    if (!effectiveMonogramLetters(spec)) errors.push('בסגנון אותיות משולבות צריך להזין 1–3 אותיות.');
  } else if (!spec.primaryText) {
    errors.push('נא להזין שמות, ראשי תיבות או טקסט אישי.');
  }
  return { spec, errors };
}

/** Monogram letters: explicit, or the first letter of each word (max 3). */
export function effectiveMonogramLetters(spec: Pick<LogoSpec, 'monogramLetters' | 'primaryText'>): string {
  if (spec.monogramLetters) return spec.monogramLetters;
  const words = spec.primaryText.split(/[\s&+\-/]+|\s+ו(?=[א-ת])/).filter(Boolean);
  return words.map(w => w.replace(/[^א-תA-Za-z]/g, '')[0] ?? '').join('').slice(0, 3);
}

/** Does this spec need an AI-generated graphic layer? */
export function needsAiDecoration(spec: LogoSpec): 'frame' | 'divider' | null {
  if (!spec.showDecoration) return null;
  if (spec.style === 'ornament') return 'frame';
  // A specific graphic requested in chat ("add a flower branch under the names")
  // on a text style → AI divider. Plain classic/elegant use a drawn divider.
  if (spec.decorationInstruction && (spec.style === 'classic' || spec.style === 'elegant' || spec.style === 'modern')) return 'divider';
  return null;
}
export function needsAiMonogram(spec: LogoSpec): boolean {
  return spec.style === 'monogram' && spec.monogramMode === 'artistic';
}

/** Stable key: when unchanged between versions the AI graphic is reused (no new AI call). */
export function decorationKey(spec: LogoSpec): string | null {
  const kind = needsAiDecoration(spec);
  if (!kind) return null;
  return JSON.stringify([kind, spec.eventType, spec.notes, spec.decorationInstruction, spec.inspirationAssetId]);
}
export function monogramKey(spec: LogoSpec): string | null {
  if (!needsAiMonogram(spec)) return null;
  return JSON.stringify([effectiveMonogramLetters(spec), spec.eventType, spec.notes, spec.decorationInstruction, spec.inspirationAssetId]);
}

/** Human-readable Hebrew summary of differences between two specs (for version history). */
export function describeSpecChanges(prev: LogoSpec | null, next: LogoSpec): string[] {
  if (!prev) return ['גרסה ראשונה'];
  const out: string[] = [];
  const font = (id: string) => LOGO_FONTS.find(f => f.id === id)?.label ?? id;
  const lbl = <T extends string>(list: readonly { id: T; label: string }[], id: T) => list.find(x => x.id === id)?.label ?? id;
  if (prev.primaryText !== next.primaryText) out.push(`טקסט ראשי: „${next.primaryText}"`);
  if (prev.secondaryText !== next.secondaryText) out.push(next.secondaryText ? `טקסט משני: „${next.secondaryText}"` : 'הוסר הטקסט המשני');
  if (prev.date !== next.date) out.push(next.date ? `תאריך: ${next.date}` : 'הוסר התאריך');
  if (prev.fontId !== next.fontId) out.push(`גופן: ${font(next.fontId)}`);
  if (prev.color !== next.color) out.push(`צבע: ${next.color}`);
  if (prev.style !== next.style) out.push(`סגנון: ${lbl(LOGO_STYLES, next.style)}`);
  if (prev.symbol !== next.symbol || prev.symbolPosition !== next.symbolPosition) {
    out.push(next.symbol === 'none' ? 'הוסר הסמל' : `סמל: ${lbl(LOGO_SYMBOLS, next.symbol)} ${lbl(SYMBOL_POSITIONS, next.symbolPosition)}`);
  }
  if (prev.monogramLetters !== next.monogramLetters) out.push(`אותיות המונוגרמה: ${next.monogramLetters}`);
  if (prev.textScale !== next.textScale) out.push(next.textScale > prev.textScale ? 'הגדלת האותיות' : 'הקטנת האותיות');
  if (prev.letterSpacing !== next.letterSpacing) out.push('שינוי מרווח בין האותיות');
  if (prev.symbolScale !== next.symbolScale) out.push('שינוי גודל הסמל');
  if (prev.showDecoration !== next.showDecoration) out.push(next.showDecoration ? 'הוחזר העיטור' : 'הוסר העיטור');
  if (prev.decorationInstruction !== next.decorationInstruction && next.decorationInstruction) out.push(`עיטור: ${next.decorationInstruction}`);
  if (prev.notes !== next.notes) out.push('עודכנו ההערות');
  if (prev.eventType !== next.eventType) out.push(`סוג אירוע: ${lbl(LOGO_EVENTS, next.eventType)}`);
  return out.length ? out : ['ללא שינוי בנתונים'];
}

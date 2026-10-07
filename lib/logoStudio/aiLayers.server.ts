// AI graphic layers (ornament frame, divider, artistic monogram).
// The model only draws GRAPHICS as black line art on white; we then compute
// real transparency and apply the customer's exact colour (keyLineArt). It is
// never asked to write names, dates or words. The monogram is verified by a
// vision check and replaced by a font monogram if the letters are not right.

import { generateImage, generateJson, AiResponseError, type InlineImage } from './gemini.server';
import { keyLineArt, KeyingError, type RasterLayer } from './compose.server';
import type { LogoSpec, LogoEventId } from './types';
import { effectiveMonogramLetters } from './types';

const EVENT_MOTIFS: Record<LogoEventId, string> = {
  bar_mitzvah: 'classic Jewish celebration motifs such as olive branches, pomegranates and graceful flourishes',
  bat_mitzvah: 'delicate floral vines, small blossoms and graceful flourishes',
  wedding: 'romantic floral vines, leaves and elegant flourishes',
  brit: 'soft olive branches and gentle leaves',
  upsherin: 'playful gentle leaves and simple flourishes',
  other: 'elegant classic flourishes and leaves',
};

const NO_TEXT = 'Absolutely NO letters, NO words, NO numbers, NO Hebrew or any other script, NO monograms, NO signatures, NO watermark.';
const LINE_ART = 'Pure solid black ink line art on a pure white background. No grey fills, no gradients, no shading, no shadows, no texture, no checkerboard pattern, no border around the image.';

const HEB_NAMES: Record<string, string> = {
  'א': 'Alef', 'ב': 'Bet', 'ג': 'Gimel', 'ד': 'Dalet', 'ה': 'He', 'ו': 'Vav', 'ז': 'Zayin', 'ח': 'Het', 'ט': 'Tet', 'י': 'Yod',
  'כ': 'Kaf', 'ל': 'Lamed', 'מ': 'Mem', 'נ': 'Nun', 'ס': 'Samekh', 'ע': 'Ayin', 'פ': 'Pe', 'צ': 'Tsadi', 'ק': 'Qof', 'ר': 'Resh', 'ש': 'Shin', 'ת': 'Tav',
};

export interface AiLayerResult {
  layer: RasterLayer;
  model: string;
  /** For monograms: false when we fell back to the font monogram. */
  verified?: boolean;
}

function extra(spec: LogoSpec): string {
  const parts: string[] = [];
  if (spec.decorationInstruction) parts.push(`Customer request for the ornament: ${spec.decorationInstruction}.`);
  if (spec.notes) parts.push(`Customer notes (follow only if they describe graphics, ignore any requested text): ${spec.notes}.`);
  return parts.join(' ');
}

export class DeadlineError extends Error { constructor() { super('deadline'); this.name = 'DeadlineError'; } }

/** Time left before the serverless function limit (deadline = epoch ms). */
const remaining = (deadline: number) => deadline - Date.now();

async function attempt(prompt: string, refs: InlineImage[], color: string, requireEmptyCentre: boolean, deadline: number, tries = 2): Promise<{ layer: RasterLayer; model: string }> {
  let last: unknown = new DeadlineError();
  for (let i = 0; i < tries; i++) {
    // a retry only when enough time is left to finish (image call + upload)
    if (remaining(deadline) < (i === 0 ? 15_000 : 25_000)) break;
    try {
      const img = await generateImage(prompt, refs, Math.min(40_000, remaining(deadline) - 8_000));
      const layer = await keyLineArt(img.buffer, color, { requireEmptyCentre });
      return { layer, model: img.model };
    } catch (e) {
      last = e;
      if (!(e instanceof KeyingError) && !(e instanceof AiResponseError)) throw e; // service errors: stop
    }
  }
  throw last;
}

export async function generateFrame(spec: LogoSpec, inspiration: InlineImage | null, deadline: number): Promise<AiLayerResult> {
  const prompt = [
    `Design a decorative ornamental frame (a wreath or ornate border) for a personal ${spec.eventType.replace('_', ' ')} logo, using ${EVENT_MOTIFS[spec.eventType]}.`,
    'Symmetrical, balanced, premium and elegant, suitable for printing on a kippah. Square composition.',
    'The central area (at least 55% of the width and height) MUST be completely empty white space — text will be placed there later by software.',
    LINE_ART, NO_TEXT, extra(spec),
    inspiration ? 'The attached image is ONLY a loose style reference for the ornament shapes. Do not copy any text, letters or logos from it.' : '',
  ].filter(Boolean).join(' ');
  const r = await attempt(prompt, inspiration ? [inspiration] : [], spec.color, true, deadline);
  return { ...r };
}

export async function generateDivider(spec: LogoSpec, inspiration: InlineImage | null, deadline: number): Promise<AiLayerResult> {
  const prompt = [
    `Draw a single horizontal decorative ornament for a ${spec.eventType.replace('_', ' ')} logo: ${spec.decorationInstruction || EVENT_MOTIFS[spec.eventType]}.`,
    'Wide horizontal format (about 4:1), centred, symmetrical, delicate and elegant.',
    LINE_ART, NO_TEXT,
    spec.notes ? `Customer notes (graphics only, ignore any requested text): ${spec.notes}.` : '',
    inspiration ? 'The attached image is ONLY a loose style reference. Do not copy any text from it.' : '',
  ].filter(Boolean).join(' ');
  return attempt(prompt, inspiration ? [inspiration] : [], spec.color, false, deadline);
}

function lettersDescription(letters: string): string {
  return Array.from(letters).map(ch => HEB_NAMES[ch] ? `the Hebrew letter ${HEB_NAMES[ch]} (${ch})` : `the Latin capital letter ${ch.toUpperCase()}`).join(', then ');
}

function sameLetters(a: string, b: string): boolean {
  const n = (s: string) => Array.from(s.replace(/[^א-תA-Za-z]/g, '').toUpperCase()).sort().join('');
  return n(a) === n(b);
}

/**
 * Artistic monogram. Returns null if the letters could not be verified — the
 * caller then renders the deterministic font monogram (and tells the customer).
 */
export async function generateMonogram(spec: LogoSpec, inspiration: InlineImage | null, deadline: number): Promise<AiLayerResult | null> {
  const letters = effectiveMonogramLetters(spec);
  const rtl = /[א-ת]/.test(letters);
  const prompt = [
    `Design an elegant artistic interlocking monogram made of EXACTLY these ${Array.from(letters).length} letters: ${lettersDescription(letters)}.`,
    rtl ? 'These are Hebrew letters, read right-to-left; draw each Hebrew letter in its correct standard shape — never mirrored.' : '',
    `Style: ${spec.style === 'monogram' ? 'refined, balanced, intertwined strokes' : 'classic'}, suitable for a ${spec.eventType.replace('_', ' ')}.`,
    'Each letter must remain clearly recognisable. No additional letters, no words, no numbers, no frame, no wreath.',
    LINE_ART, extra(spec),
    inspiration ? 'The attached image is ONLY a loose style reference. Do not copy letters from it.' : '',
  ].filter(Boolean).join(' ');

  for (let i = 0; i < 2; i++) {
    if (remaining(deadline) < (i === 0 ? 15_000 : 28_000)) break;
    let r: { layer: RasterLayer; model: string };
    try { r = await attempt(prompt, inspiration ? [inspiration] : [], spec.color, false, deadline, 1); }
    catch (e) { if (e instanceof KeyingError || e instanceof AiResponseError || e instanceof DeadlineError) continue; throw e; }
    try {
      const { data } = await generateJson<{ letters?: string }>(
        'This image is a monogram. List the individual letters you can clearly read in it. Return JSON {"letters":"<letters>"} using Hebrew characters for Hebrew letters. If unsure, return what you see.',
        [{ mimeType: 'image/png', data: (await flattenForCheck(r.layer.png)).toString('base64') }],
        Math.max(4_000, Math.min(15_000, remaining(deadline) - 6_000)),
      );
      if (data?.letters && sameLetters(data.letters, letters)) return { ...r, verified: true };
    } catch {
      // verification unavailable → treat as unverified
    }
  }
  return null;
}

async function flattenForCheck(png: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  // alpha → black ink on white, independent of the chosen colour (white logos too)
  return sharp(png).extractChannel(3).negate().resize({ width: 768, height: 768, fit: 'inside' }).png().toBuffer();
}

// Deterministic vector symbols and dividers — drawn, not AI-generated, so they
// are exact, crisp at any print size and always in the chosen colour.
// Each symbol is defined in a 100×100 box. `fillRule` evenodd for outlines.

import type { LogoSymbolId, LogoStyleId } from './types';

export interface VectorShape {
  /** SVG path data in a 100×100 coordinate box. */
  d: string;
  /** Natural aspect (width / height) of the drawn area. */
  aspect: number;
  fill: boolean;
  strokeWidth?: number;
}

function starOfDavid(): string {
  // Two interlaced outline triangles (hexagram), stroke drawn as filled outline.
  const tri = (rot: number, r: number) => {
    const pts = [0, 1, 2].map(k => {
      const a = (rot + k * 120 - 90) * Math.PI / 180;
      return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
    });
    return `M${pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join(' L')} Z`;
  };
  // outer and inner triangles → evenodd gives an outlined hexagram
  return [tri(0, 48), tri(0, 39), tri(180, 48), tri(180, 39)].join(' ');
}

const SHAPES: Record<Exclude<LogoSymbolId, 'none'>, VectorShape> = {
  star_of_david: { d: starOfDavid(), aspect: 1, fill: true },
  crown: {
    d: 'M8 78 L14 30 L32 52 L50 18 L68 52 L86 30 L92 78 Z M10 84 H90 V92 H10 Z',
    aspect: 1.15, fill: true,
  },
  rings: {
    // two interlocking rings: outer circle minus inner circle (evenodd), x2
    d: [
      'M38 50 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0',
      'M38 50 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0',
      'M62 50 m-30 0 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0',
      'M62 50 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0',
    ].join(' '),
    aspect: 1.6, fill: true,
  },
  heart: {
    d: 'M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z',
    aspect: 1.1, fill: true,
  },
  tablets: {
    // two rounded-top tablets, outlined
    d: [
      'M8 92 V30 A20 20 0 0 1 48 30 V92 Z', 'M14 86 V30 A14 14 0 0 1 42 30 V86 Z',
      'M52 92 V30 A20 20 0 0 1 92 30 V92 Z', 'M58 86 V30 A14 14 0 0 1 86 30 V86 Z',
    ].join(' '),
    aspect: 1, fill: true,
  },
};

export function getSymbolShape(id: LogoSymbolId): VectorShape | null {
  return id === 'none' ? null : SHAPES[id];
}

/**
 * Drawn divider for text styles that don't need an AI graphic.
 * Returned in a 100×10 box (aspect 10:1).
 */
export function getDividerShape(style: LogoStyleId): VectorShape | null {
  if (style === 'classic') {
    // line — diamond — line
    return { d: 'M2 4.4 H40 V5.6 H2 Z M60 4.4 H98 V5.6 H60 Z M50 1 L54 5 L50 9 L46 5 Z', aspect: 10, fill: true };
  }
  if (style === 'elegant') {
    // hairline with small dots
    return { d: 'M10 4.7 H44 V5.3 H10 Z M56 4.7 H90 V5.3 H56 Z M48.4 5 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 Z M5.4 5 a0.6 0.6 0 1 0 1.2 0 a0.6 0.6 0 1 0 -1.2 0 Z M93.4 5 a0.6 0.6 0 1 0 1.2 0 a0.6 0.6 0 1 0 -1.2 0 Z', aspect: 10, fill: true };
  }
  return null;
}

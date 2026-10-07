// Production readiness of the approved logo PNG (shared, pure).
// Honest by construction: the file is only "ready" when the physical print
// size is configured AND the effective resolution meets the minimum DPI,
// counting raster (AI) layers at their real source resolution.

import type { Placement, ResolvedSelection } from './catalog';

export interface ProductionInfo {
  pixelWidth: number;
  pixelHeight: number;
  printWidthMm: number | null;
  printHeightMm: number | null;
  effectiveDpi: number | null;
  minDpi: number;
  ready: boolean;
  issues: string[];
}

export function productionInfo(
  logo: { width: number; height: number; rasterScale: number },
  placement: Placement,
  area: ResolvedSelection['printArea'],
  maxPrintWidthMm: number | null,
  minDpi = 300,
): ProductionInfo {
  const issues: string[] = [];
  let printWidthMm: number | null = null, printHeightMm: number | null = null, dpi: number | null = null;
  if (!maxPrintWidthMm) {
    issues.push('לא הוגדרו מידות הדפסה למוצר (מ״מ) — יש להגדיר באדמין ← סטודיו לוגו ← מוצרים.');
  } else {
    printWidthMm = Math.round((maxPrintWidthMm * placement.w / area.maxW) * 10) / 10;
    printHeightMm = Math.round((printWidthMm * logo.height / logo.width) * 10) / 10;
    const vectorDpi = logo.width / (printWidthMm / 25.4);
    dpi = Math.floor(vectorDpi * Math.min(1, logo.rasterScale || 1));
    if (dpi < minDpi) issues.push(`רזולוציה אפקטיבית ${dpi} DPI נמוכה מהמינימום (${minDpi}).`);
  }
  return {
    pixelWidth: logo.width, pixelHeight: logo.height,
    printWidthMm, printHeightMm, effectiveDpi: dpi, minDpi,
    ready: issues.length === 0, issues,
  };
}

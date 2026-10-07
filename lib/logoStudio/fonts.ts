// Logo Studio font registry — shared by client (preview via @font-face) and
// server (exact rendering via opentype.js from the SAME files).
//
// All fonts are from Google Fonts under the SIL Open Font License 1.1, which
// allows use on the site AND in commercial products/print output (logos on
// kippot). License texts ship next to the files: public/fonts/logo-studio/OFL-*.txt
// Every font below was checked for full Hebrew + Latin + digit coverage.

export const LOGO_FONTS = [
  { id: 'david',     label: 'דוד קלאסי',     family: 'LS David Libre',  file: 'DavidLibre-Bold.ttf',      category: 'serif',   lineHeight: 1.15 },
  { id: 'suez',      label: 'סואץ חגיגי',    family: 'LS Suez One',     file: 'SuezOne-Regular.ttf',      category: 'serif',   lineHeight: 1.15 },
  { id: 'bellefair', label: 'בלפייר אלגנטי', family: 'LS Bellefair',    file: 'Bellefair-Regular.ttf',    category: 'serif',   lineHeight: 1.15 },
  { id: 'secular',   label: 'סקולר מודגש',   family: 'LS Secular One',  file: 'SecularOne-Regular.ttf',   category: 'sans',    lineHeight: 1.1 },
  { id: 'alef',      label: 'אלף נקי',       family: 'LS Alef',         file: 'Alef-Bold.ttf',            category: 'sans',    lineHeight: 1.1 },
  { id: 'varela',    label: 'וארלה מעוגל',   family: 'LS Varela Round', file: 'VarelaRound-Regular.ttf',  category: 'rounded', lineHeight: 1.1 },
  { id: 'karantina', label: 'קרנטינה צר',    family: 'LS Karantina',    file: 'Karantina-Bold.ttf',       category: 'display', lineHeight: 1.0 },
  { id: 'amatic',    label: 'אמטיק כתב יד',  family: 'LS Amatic SC',    file: 'AmaticSC-Bold.ttf',        category: 'hand',    lineHeight: 1.0 },
] as const;

export type LogoFontId = typeof LOGO_FONTS[number]['id'];
export type LogoFont = typeof LOGO_FONTS[number];

export const LOGO_FONT_PUBLIC_DIR = '/fonts/logo-studio';

export function getLogoFont(id: string): LogoFont {
  return LOGO_FONTS.find(f => f.id === id) ?? LOGO_FONTS[0];
}

/** @font-face CSS for the client — loads the exact same files the server renders with. */
export function logoFontFaceCss(): string {
  return LOGO_FONTS.map(f =>
    `@font-face{font-family:'${f.family}';src:url('${LOGO_FONT_PUBLIC_DIR}/${f.file}') format('truetype');font-display:swap;}`,
  ).join('\n');
}

// artDirector.mjs
// ה"מוח" של מערכת הצילום — לא מייצר תמונות, רק חושב כמו Art Director
// ובונה את הפרומט המושלם ל-Gemini image generation.
//
// שני שלבים:
//   1. analyzeProduct()   — ניתוח מוצר → Creative Profile (רץ פעם אחת, נשמר ל-Firestore)
//   2. buildGeminiPrompt() — Profile + VISUAL_DNA קבוע → פרומט אנגלי מקצועי אחד
//
// שימוש: import { buildImagePrompt } from './artDirector.mjs'

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// מודל טקסט זול+מהיר לניתוח ולבניית הפרומט (לא ליצירת התמונה)
const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ═══════════════════════════════════════════════════════════════
//  VISUAL DNA — ליבת המותג. קבוע. זהה לכל 1000 המוצרים.
//  זה מה שגורם לכל הקטלוג להיראות כאילו צולם באותו סטודיו יוקרה.
// ═══════════════════════════════════════════════════════════════
export const VISUAL_DNA = {
  brand: 'YourSofer — modern Israeli luxury Judaica',
  // פלטה חמה בלבד — אין סטיות
  palette: 'warm beige, natural stone, cream, oak, walnut, soft graphite',
  // רשימה סגורה של משטחים מותרים — לא רנדומלי
  allowedSurfaces: [
    'honed travertine',
    'warm limestone',
    'cream marble',
    'natural warm oak',
    'walnut wood',
    'natural linen cloth',
  ],
  lighting: 'soft natural window light, warm indirect, golden-hour feel',
  camera: '85mm lens, eye level or slightly above, three-quarter view, real lens compression, no distortion',
  depthOfField: 'product perfectly sharp, background softly blurred with real optical bokeh',
  colorGrading: 'warm, low-contrast, editorial, timeless — like a premium interior magazine',
  productShare: 'the product fills 60–70% of the frame and is unmistakably the hero',
  // אילוצים קשיחים — נכנסים כ-negative prompt לכל תמונה
  hardNegatives: [
    'do NOT alter, redesign, or restyle the product in any way',
    'preserve exactly: logo, typography, embroidery, print, material, shape, proportions, color, texture, stitching, edges',
    // הכשלים שנצפו בפועל בלוג — נאמרים במפורש כי הכלל הכללי לא הספיק
    'do NOT change the GEOMETRY of any embroidered or printed motif — a rectangle stays a rectangle, never becomes a hexagon, diamond or circle',
    'do NOT change the product\'s base color or its lettering color (e.g. white must not become burgundy, black lettering must not become gold)',
    'do NOT invent, simplify, add or remove ornamental details that are not in the reference image',
    'do NOT "improve", beautify or modernize the product design',
    'no text overlays, no watermarks, no added logos',
    'no surreal or AI-fantasy environments, no exaggerated or unrealistic scenes',
    'no harsh flash, no HDR, no dramatic hard shadows, no artificial blur',
    'no visual clutter, no distracting colors, no fake decorations',
    'maximum 2 subtle props',
  ],
};

// ═══════════════════════════════════════════════════════════════
//  שלב 1 — ניתוח מוצר. רץ פעם אחת פר מוצר, נשמר ל-Firestore.
// ═══════════════════════════════════════════════════════════════
export async function analyzeProduct(product) {
  const analysisPrompt = `You are the creative director of a luxury branding agency.
Analyze this Judaica product and return ONLY a JSON object (no markdown, no backticks, no preamble).

Product title: ${product.title || product.name || ''}
Description: ${product.description || ''}
Category: ${product.category || ''}
Colors: ${product.colors || product.color || ''}
Material: ${product.material || ''}

Return this exact JSON shape:
{
  "dominantMaterial": "",
  "dominantColors": "",
  "warmOrCool": "warm|cool",
  "luxuryLevel": "1-10 integer as string",
  "mood": "one short phrase",
  "chosenSurface": "MUST be exactly one of: honed travertine | warm limestone | cream marble | natural warm oak | walnut wood | natural linen cloth",
  "chosenInterior": "one short realistic luxury interior, e.g. 'minimal warm living room', 'boutique hotel shelf', 'private library'",
  "suggestedProps": "0 to 2 subtle props or empty string"
}

Rules:
- chosenSurface MUST harmonize with the product colors (warm product → travertine/limestone/oak/linen; cool product → walnut/marble).
- Keep everything minimal, timeless, expensive-feeling.`;

  const result = await textModel.generateContent(analysisPrompt);
  const raw = result.response.text().replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    // fallback בטוח אם ה-JSON נכשל
    return {
      dominantMaterial: product.material || 'fabric',
      dominantColors: product.colors || 'neutral',
      warmOrCool: 'warm',
      luxuryLevel: '8',
      mood: 'quiet luxury',
      chosenSurface: 'honed travertine',
      chosenInterior: 'minimal warm living room',
      suggestedProps: '',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  שלב 2 — בניית פרומט Gemini אחד מה-Profile + ה-Visual DNA.
//  דטרמיניסטי, לא קורא ל-LLM שוב — מרכיב טקסט.
// ═══════════════════════════════════════════════════════════════
export function buildGeminiPrompt(product, profile) {
  const surface = VISUAL_DNA.allowedSurfaces.includes(profile.chosenSurface)
    ? profile.chosenSurface
    : 'honed travertine';

  const props = profile.suggestedProps?.trim()
    ? `Up to 2 subtle props allowed: ${profile.suggestedProps}.`
    : 'No props unless they add realism.';

  // ההנחיה על דיוק המוצר הועברה לראש הפרומפט (08/2026). קודם היא הופיעה
  // בסוגריים בכותרת ובשלילות בסוף, והמודל התייחס אליה כהערת שוליים —
  // הבריף העיצובי שבא אחריה גבר עליה ושינה רקמות, צבעים וטיפוגרפיה.
  return `PRODUCT FIDELITY — ABSOLUTE, NON-NEGOTIABLE PRIORITY:
This is a photograph of a REAL, EXISTING product shown in the reference image.
You are relighting and re-staging it — you are NOT designing, redrawing or reimagining it.
Reproduce the product pixel-faithfully: every embroidery stitch and its exact geometry,
every printed or engraved letter, every ornament outline, the exact hues, the weave and
texture of the fabric, the silhouette and proportions. If any single detail of the product
would differ from the reference, the image is a failure — even if it looks more beautiful.
The scene serves the product; the product never bends to the scene.

Premium luxury product photograph for a high-end Judaica brand (${VISUAL_DNA.brand}).

THE PRODUCT (the hero — keep it 100% identical to the reference image):
${product.title || product.name}. Material: ${profile.dominantMaterial}. Colors: ${profile.dominantColors}.

SCENE:
The product rests on ${surface}, set within a believable, realistic ${profile.chosenInterior}. ${props}
The environment exists only to elevate the product's perceived value — never to compete with it.

VISUAL DIRECTION:
- Palette: ${VISUAL_DNA.palette}, chosen to sit beside the product's own colors.
  NEVER shift the product's colors to match the palette — the palette adapts, the product does not.
- Lighting: ${VISUAL_DNA.lighting}.
- Camera: ${VISUAL_DNA.camera}.
- Depth of field: ${VISUAL_DNA.depthOfField}.
- Color grading: ${VISUAL_DNA.colorGrading}.
- Framing: ${VISUAL_DNA.productShare}.
- Mood: ${profile.mood}, elegant, minimal, sophisticated, timeless, expensive.
- Quality reference: Apple product photography, Restoration Hardware, premium interior magazines.

STRICT NEGATIVE INSTRUCTIONS:
${VISUAL_DNA.hardNegatives.map((n) => `- ${n}`).join('\n')}`;
}

// helper אחד שמריץ את שני השלבים
export async function buildImagePrompt(product) {
  const profile = await analyzeProduct(product);
  const prompt = buildGeminiPrompt(product, profile);
  return { profile, prompt };
}

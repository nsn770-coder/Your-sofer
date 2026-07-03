import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ── Prompts ───────────────────────────────────────────────────────────────────

// {COLOR} is replaced per-request (defaults to white satin — the print-order flow).
const KIPPAH_PROMPT = `You are a product mockup photographer. The attached image is a CUSTOMER'S LOGO. Generate a single photorealistic product photo: a clean {COLOR} kippah (Jewish skullcap), photographed from a slight top-down 3/4 angle on a soft neutral studio background.

Place the provided logo CENTERED on the top of the kippah, printed as if embroidered/printed directly onto the fabric. The logo MUST curve naturally with the dome of the kippah — apply realistic perspective warp so it follows the rounded surface, not a flat sticker. Add subtle fabric texture and soft shadowing over the logo so it looks genuinely printed on cloth.

CRITICAL CONSTRAINTS:
- Do NOT alter, redraw, restyle, translate, or "improve" the logo. Reproduce it EXACTLY: same colors, same text (including any Hebrew letters), same shapes. Hebrew text must remain identical and readable — never mirror or modify it.
- Keep the logo proportions intact; only warp for the curved surface.
- Output ONLY the final product photo, no text, no watermark, no border.`;

const SHIRT_PROMPT = `You are a product mockup photographer. The attached image is a CUSTOMER'S LOGO. Generate a single photorealistic product photo: a plain white cotton t-shirt laid flat (flat-lay) or on a clean mannequin, soft neutral studio background, front view.

Place the provided logo on the CENTER CHEST area of the shirt, printed as a realistic screen-print / DTG print. The logo must follow the gentle fabric folds with subtle wrinkles and soft shadows so it looks genuinely printed on the cotton, not a flat overlay.

CRITICAL CONSTRAINTS:
- Do NOT alter, redraw, restyle, translate, or "improve" the logo. Reproduce it EXACTLY: same colors, same text (including any Hebrew letters), same shapes. Hebrew text must remain identical and readable — never mirror or modify it.
- Keep the logo proportions intact; only adapt to fabric folds.
- Output ONLY the final product photo, no text, no watermark, no border.`;

// ── Rate limiting ─────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  const ip = xff ? xff.split(',')[0].trim() : 'unknown';
  return ip.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const db = getAdminDb();
  const ref = db.collection('mockupRateLimit').doc(ip);
  const WINDOW_MS = 10 * 60 * 1000;
  const MAX_COUNT = 5;

  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const now = Date.now();

    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStart: now });
      return { allowed: true };
    }

    const { count, windowStart } = snap.data() as { count: number; windowStart: number };
    if (now - windowStart >= WINDOW_MS) {
      tx.set(ref, { count: 1, windowStart: now });
      return { allowed: true };
    }
    if (count >= MAX_COUNT) return { allowed: false };
    tx.update(ref, { count: count + 1 });
    return { allowed: true };
  });
}

// ── Gemini helpers ────────────────────────────────────────────────────────────

async function analyzeLogoWithFlash(mimeType: string, base64: string): Promise<string> {
  const url = `${GEMINI_BASE}/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Briefly describe this logo in one sentence: main colors, overall shape (circular/rectangular/etc), and whether it contains Hebrew text. Keep it under 40 words.' },
          { inlineData: { mimeType, data: base64 } },
        ],
      }],
    }),
  });
  if (!res.ok) return '';
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined) ?? '';
}

class ServiceDisabledError extends Error {
  constructor() { super('service_disabled'); this.name = 'ServiceDisabledError'; }
}

// Allowed kippah colors — keys match the style ids used on /kippot-order.
// Locked to a whitelist so the client can never inject arbitrary prompt text.
const KIPPAH_COLORS: Record<string, string> = {
  lavan:    'white linen with a subtle pinkish weave',
  beige:    'beige linen',
  marva:    'sage-green linen',
  techelet: 'royal-blue linen',
};

async function generateMockup(
  mimeType: string,
  base64: string,
  productType: 'kippah' | 'shirt',
  logoDescription: string,
  kippahColor?: string,
): Promise<{ imageBase64: string; imageMimeType: string }> {
  const url = `${GEMINI_BASE}/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;
  const colorDesc = (kippahColor && KIPPAH_COLORS[kippahColor]) || 'white satin';
  const basePrompt = productType === 'kippah'
    ? KIPPAH_PROMPT.replace('{COLOR}', colorDesc)
    : SHIRT_PROMPT;
  const prompt = logoDescription
    ? `${basePrompt}\n\nLogo description for reference: ${logoDescription}`
    : basePrompt;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } },
        ],
      }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const errText = await res.text().catch(() => '');
    if (
      status === 403 ||
      errText.includes('SERVICE_DISABLED') ||
      errText.includes('billing') ||
      errText.includes('has not been used') ||
      errText.includes('RESOURCE_EXHAUSTED')
    ) {
      throw new ServiceDisabledError();
    }
    throw new Error(`Gemini ${status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };
  const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imagePart?.inlineData) throw new Error('No image part in Gemini response');
  return { imageBase64: imagePart.inlineData.data, imageMimeType: imagePart.inlineData.mimeType };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { logoBase64, productType, kippahColor } = body as {
      logoBase64?: string; productType?: string; kippahColor?: string;
    };

    if (!logoBase64 || typeof logoBase64 !== 'string') {
      return NextResponse.json({ error: 'logoBase64 is required' }, { status: 400 });
    }
    if (productType !== 'kippah' && productType !== 'shirt') {
      return NextResponse.json({ error: 'productType must be kippah or shirt' }, { status: 400 });
    }

    // Rate limit
    const ip = getClientIp(req);
    const { allowed } = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'ניסיתם הרבה פעמים, נסו שוב בעוד כמה דקות' },
        { status: 429 },
      );
    }

    // Parse data URL (strip prefix if present)
    let mimeType = 'image/jpeg';
    let base64Data = logoBase64;
    if (logoBase64.startsWith('data:')) {
      const match = logoBase64.match(/^data:([^;]+);base64,([\s\S]+)$/);
      if (!match) return NextResponse.json({ error: 'Invalid image data URL' }, { status: 400 });
      mimeType = match[1];
      base64Data = match[2];
    }

    // Optional analysis (non-blocking — failure is OK)
    let logoDescription = '';
    try {
      logoDescription = await analyzeLogoWithFlash(mimeType, base64Data);
    } catch {
      // proceed without description
    }

    // Generate mockup
    const { imageBase64, imageMimeType } = await generateMockup(
      mimeType,
      base64Data,
      productType,
      logoDescription,
      typeof kippahColor === 'string' ? kippahColor : undefined,
    );

    return NextResponse.json({ imageBase64, mimeType: imageMimeType });

  } catch (err: unknown) {
    if (err instanceof ServiceDisabledError) {
      return NextResponse.json({ error: 'service_disabled' }, { status: 503 });
    }
    console.error('[kippah-mockup]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

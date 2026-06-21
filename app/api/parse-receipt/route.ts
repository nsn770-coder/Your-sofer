import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  'You are a JSON extraction engine. You must respond with ONLY a single raw JSON object — ' +
  'no markdown, no ```json code fences, no preamble, no explanation, no summary, no trailing text. ' +
  'Your entire response must start with "{" and end with "}". Any text outside the JSON object is forbidden.';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });

  const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const buffer     = await file.arrayBuffer();
  const base64Data = Buffer.from(buffer).toString('base64');

  const message = await client.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Data },
        },
        {
          type: 'text',
          text: `Extract from this supplier invoice (Hebrew/English).
RULES: every field is required. If a value cannot be found use "" for strings and 0 for numbers — never omit a key, never use null or undefined.

Return ONLY valid JSON (no markdown, no code fences, no preamble, no explanation):
{
  "invoiceDate": "YYYY-MM-DD or ''",
  "invoiceNumber": "string or ''",
  "supplier": "string or ''",
  "items": [
    { "code": "string or ''", "name": "string or ''", "quantity": number, "unitPrice": number }
  ]
}`,
        },
      ],
    }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  console.log('Claude raw response:', text);

  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  const jsonStr = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({
      success: false,
      error: 'לא הצלחתי לפענח את הקבלה, נסה תמונה ברורה יותר',
      rawResponse: text,
    });
  }

  // Normalize: guarantee no undefined / null so Firestore query + addDoc never throw
  const safe = {
    invoiceDate:   String(parsed.invoiceDate   ?? ''),
    invoiceNumber: String(parsed.invoiceNumber ?? ''),
    supplier:      String(parsed.supplier      ?? ''),
    items: (Array.isArray(parsed.items) ? parsed.items : []).map(
      (item: Record<string, unknown>) => ({
        code:      String(item.code      ?? ''),
        name:      String(item.name      ?? ''),
        quantity:  Number(item.quantity  ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
      })
    ),
  };

  return NextResponse.json({ success: true, ...safe });
}

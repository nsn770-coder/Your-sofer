import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

  const ext       = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mediaType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const buffer     = await file.arrayBuffer();
  const base64Data = Buffer.from(buffer).toString('base64');

  const message = await client.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 1024,
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

Return ONLY valid JSON (no markdown, no extra text):
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

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').replace(/^```\n?/, '');

  try {
    const parsed = JSON.parse(json);
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
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response', raw: text }, { status: 422 });
  }
}

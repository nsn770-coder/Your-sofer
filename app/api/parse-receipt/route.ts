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
          text: `Extract from this supplier invoice (Hebrew/English):
1. Invoice date, number, supplier name
2. All line items: SKU/code, name, quantity, unit price

Return ONLY valid JSON (no markdown):
{
  "invoiceDate": "YYYY-MM-DD",
  "invoiceNumber": "string",
  "supplier": "string",
  "items": [
    { "code": "string", "name": "string", "quantity": number, "unitPrice": number }
  ]
}`,
        },
      ],
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const json = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').replace(/^```\n?/, '');

  try {
    return NextResponse.json(JSON.parse(json));
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response', raw: text }, { status: 422 });
  }
}

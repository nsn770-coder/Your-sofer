import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// חילוץ מהיר מקבלת הוצאה: ספק, תאריך, מספר חשבונית וסכום סופי.
// בשונה מ-parse-receipt (שמפרק שורות פריטים למלאי) — כאן רק סיכום לרישום הוצאה.
export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  'You are a JSON extraction engine. You must respond with ONLY a single raw JSON object — ' +
  'no markdown, no ```json code fences, no preamble, no explanation, no summary, no trailing text. ' +
  'Your entire response must start with "{" and end with "}". Any text outside the JSON object is forbidden.';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const buffer     = await file.arrayBuffer();
  const base64Data = Buffer.from(buffer).toString('base64');

  const promptText = `Extract summary data from this supplier receipt / invoice (Hebrew/English).
RULES: every field is required. If a value cannot be found use "" for strings and 0 for numbers — never omit a key, never use null.
"total" = the FINAL amount paid including VAT (הסכום הסופי לתשלום כולל מע"מ). If several totals appear, take the final payable one.

Return ONLY valid JSON (no markdown, no code fences):
{
  "supplier": "string or ''",
  "invoiceDate": "YYYY-MM-DD or ''",
  "invoiceNumber": "string or ''",
  "total": number
}`;

  // תמונה או PDF — שניהם נתמכים
  const fileBlock: Anthropic.ContentBlockParam = ext === 'pdf'
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
      }
    : {
        type: 'image',
        source: {
          type: 'base64',
          media_type: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
          data: base64Data,
        },
      };

  try {
    const message = await client.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [fileBlock, { type: 'text', text: promptText }],
      }],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

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
        error: 'לא הצלחתי לפענח את הקבלה',
        rawResponse: text,
      });
    }

    return NextResponse.json({
      success: true,
      supplier:      String(parsed.supplier      ?? ''),
      invoiceDate:   String(parsed.invoiceDate   ?? ''),
      invoiceNumber: String(parsed.invoiceNumber ?? ''),
      total:         Number(parsed.total         ?? 0),
    });
  } catch (e) {
    console.error('[parse-expense-receipt]', e);
    return NextResponse.json({ success: false, error: 'שגיאה בפענוח הקבלה' }, { status: 500 });
  }
}

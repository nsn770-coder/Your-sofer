/**
 * parseReceiptImage.mjs — קריאת חשבונית ספק עם Claude Vision
 *
 * Usage: node app/scripts/parseReceiptImage.mjs <path-to-image>
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load ANTHROPIC_API_KEY from .env.local
const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const env = fs.readFileSync(resolve(__dir, '../../.env.local'), 'utf-8');
  for (const line of env.split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
} catch { /* rely on existing env */ }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function parseReceiptImage(imagePath) {
  const abs = path.resolve(imagePath);
  if (!fs.existsSync(abs)) throw new Error(`קובץ לא נמצא: ${abs}`);

  const imageBuffer = fs.readFileSync(abs);
  const base64Image = imageBuffer.toString('base64');

  // Detect media type from extension
  const ext = path.extname(abs).toLowerCase();
  const mediaType = ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : ext === '.gif'  ? 'image/gif'
    : 'image/jpeg';

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Image },
          },
          {
            type: 'text',
            text: `Extract from this supplier invoice (Hebrew/English):
1. Invoice date, number, supplier name
2. All products: SKU/code, name, quantity, unit price

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
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const jsonStr = content.text.trim()
    .replace(/^```json\n?/, '').replace(/\n?```$/, '').replace(/^```\n?/, '');

  return JSON.parse(jsonStr);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const imagePath = process.argv[2];
if (!imagePath) {
  console.error('Usage: node parseReceiptImage.mjs <image-path>');
  process.exit(1);
}

console.log(`📄 מנתח חשבונית: ${imagePath}`);
const result = await parseReceiptImage(imagePath);
console.log(JSON.stringify(result, null, 2));

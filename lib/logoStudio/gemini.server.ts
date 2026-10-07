/* eslint-disable @typescript-eslint/no-explicit-any -- Firestore document data / Gemini JSON are untyped at this boundary and validated field by field */
// Gemini access for Logo Studio — same REST pattern already used in production
// by app/api/kippah-mockup (image) and scripts/translateProducts.mjs (JSON):
//   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
//   generationConfig.responseModalities: ['IMAGE']        (image models)
//   generationConfig.responseMimeType: 'application/json' (text models)
//
// Model IDs come from the official model list (ai.google.dev/gemini-api/docs).
// Google retires models without notice (gemini-2.0-flash disappeared in 08/2026),
// so each call walks an ordered list and falls through on 404/400. Override the
// lists with LOGO_STUDIO_IMAGE_MODELS / LOGO_STUDIO_TEXT_MODELS (comma separated).
// The API key never leaves the server; prompts are never returned to clients.

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const IMAGE_MODELS = (process.env.LOGO_STUDIO_IMAGE_MODELS || 'gemini-3.1-flash-image,gemini-2.5-flash-image')
  .split(',').map(s => s.trim()).filter(Boolean);
const TEXT_MODELS = (process.env.LOGO_STUDIO_TEXT_MODELS || 'gemini-3.5-flash,gemini-2.5-flash,gemini-3.5-flash-lite,gemini-2.5-flash-lite')
  .split(',').map(s => s.trim()).filter(Boolean);

export class AiUnavailableError extends Error {
  constructor(public readonly code: 'no_key' | 'service_disabled' | 'quota' | 'no_model') {
    super(`ai_unavailable:${code}`);
    this.name = 'AiUnavailableError';
  }
}
export class AiResponseError extends Error {
  constructor(message: string) { super(message); this.name = 'AiResponseError'; }
}

export interface InlineImage { mimeType: string; data: string /* base64 */ }

function apiKey(): string {
  const k = process.env.GEMINI_API_KEY ?? '';
  if (!k) throw new AiUnavailableError('no_key');
  return k;
}

let workingImageModel: string | null = null;
let workingTextModel: string | null = null;

async function callModel(model: string, body: unknown, timeoutMs: number): Promise<{ status: number; json?: any; text?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      // key in a header rather than the URL so it can't end up in request logs
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey() },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return { status: res.status, text: (await res.text().catch(() => '')).slice(0, 400) };
    return { status: 200, json: await res.json() };
  } finally {
    clearTimeout(timer);
  }
}

function classifyFailure(status: number, text = ''): 'next_model' | AiUnavailableError | AiResponseError {
  if (status === 404 || (status === 400 && /not found|not supported|unsupported|invalid model|responseModalities|response_modalities/i.test(text))) return 'next_model';
  if (status === 403 || /SERVICE_DISABLED|has not been used|billing/i.test(text)) return new AiUnavailableError('service_disabled');
  if (status === 429 || /RESOURCE_EXHAUSTED/.test(text)) return new AiUnavailableError('quota');
  return new AiResponseError(`gemini_${status}`);
}

async function withModels<T>(
  models: string[], getWorking: () => string | null, setWorking: (m: string) => void,
  run: (model: string) => Promise<{ status: number; json?: any; text?: string }>,
  parse: (json: any) => T,
): Promise<{ result: T; model: string }> {
  const ordered = getWorking() ? [getWorking()!, ...models.filter(m => m !== getWorking())] : models;
  let lastErr: Error = new AiUnavailableError('no_model');
  for (const model of ordered) {
    const r = await run(model);
    if (r.status !== 200) {
      const c = classifyFailure(r.status, r.text);
      if (c === 'next_model') { lastErr = new AiUnavailableError('no_model'); continue; }
      console.error('[logo-studio/gemini]', model, r.status, (r.text || '').slice(0, 200));
      throw c;
    }
    setWorking(model);
    return { result: parse(r.json), model };
  }
  throw lastErr;
}

/** Generate / edit an image. Returns raw image bytes. */
export async function generateImage(prompt: string, refs: InlineImage[] = [], timeoutMs = 40_000): Promise<{ buffer: Buffer; mimeType: string; model: string }> {
  const body = {
    contents: [{ parts: [{ text: prompt }, ...refs.map(r => ({ inlineData: { mimeType: r.mimeType, data: r.data } }))] }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const { result, model } = await withModels(
    IMAGE_MODELS, () => workingImageModel, m => { workingImageModel = m; },
    m => callModel(m, body, Math.max(5_000, timeoutMs)),
    json => {
      const parts: { inlineData?: { mimeType: string; data: string } }[] = json?.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
      if (!img?.inlineData) {
        const reason = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || 'no_image';
        throw new AiResponseError(`no_image:${reason}`);
      }
      return { buffer: Buffer.from(img.inlineData.data, 'base64'), mimeType: img.inlineData.mimeType };
    },
  );
  return { ...result, model };
}

/** Ask a text model for JSON. Images optional (vision check). */
export async function generateJson<T = unknown>(prompt: string, images: InlineImage[] = [], timeoutMs = 20_000): Promise<{ data: T; model: string }> {
  const body = {
    contents: [{ parts: [{ text: prompt }, ...images.map(r => ({ inlineData: { mimeType: r.mimeType, data: r.data } }))] }],
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  };
  const { result, model } = await withModels(
    TEXT_MODELS, () => workingTextModel, m => { workingTextModel = m; },
    m => callModel(m, body, timeoutMs),
    json => {
      const text: string | undefined = json?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => typeof p.text === 'string')?.text;
      if (!text) throw new AiResponseError('no_text');
      try { return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T; }
      catch { throw new AiResponseError('bad_json'); }
    },
  );
  return { data: result, model };
}

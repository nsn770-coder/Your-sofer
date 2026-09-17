import { getAdminDb } from '@/lib/firebaseAdmin';

// Two possible transports:
//   1. Meta Cloud API directly  — needs WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_API_TOKEN
//   2. 360dialog (Coexistence)  — needs D360_API_KEY
// If D360_API_KEY is set it wins, so the switch is a single env var in Vercel
// with no code change and no redeploy of logic. The JSON body is identical in
// both cases — 360dialog proxies Meta's Cloud API payload format verbatim.
const GRAPH_API_VERSION = 'v21.0';
const D360_BASE_URL = 'https://waba-v2.360dialog.io';

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const d360Key = process.env.D360_API_KEY;

  let url: string;
  let headers: Record<string, string>;

  if (d360Key) {
    // 360dialog identifies the sending number by the API key, so there is no
    // phone-number-id in the path.
    url = `${D360_BASE_URL}/messages`;
    headers = {
      'D360-API-KEY': d360Key,
      'Content-Type': 'application/json',
    };
  } else {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_API_TOKEN;

    if (!phoneNumberId || !accessToken) {
      await logError(
        'send_error',
        to,
        'No transport configured: set D360_API_KEY, or WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_API_TOKEN',
        body,
      );
      return;
    }

    url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(
        `${d360Key ? '360dialog' : 'Meta Graph API'} ${res.status}: ${errBody.slice(0, 300)}`,
      );
    }
  } catch (err) {
    await logError('send_error', to, String(err), body);
  }
}

async function logError(
  type: string,
  to: string,
  error: string,
  messagePreview: string,
): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection('whatsappLogs').add({
      type,
      to,
      messagePreview: messagePreview.slice(0, 100),
      error,
      timestamp: new Date(),
    });
  } catch {
    // Firestore also failed — nothing left to do
  }
}

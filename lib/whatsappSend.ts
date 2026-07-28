import { getAdminDb } from '@/lib/firebaseAdmin';

const GRAPH_API_VERSION = 'v21.0';

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    await logError('send_error', to, 'WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN not configured', body);
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Meta Graph API ${res.status}: ${errBody.slice(0, 300)}`);
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

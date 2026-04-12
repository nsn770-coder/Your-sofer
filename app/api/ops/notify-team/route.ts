import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const TEAM = [
  { email: 'nsn770@gmail.com', name: 'נסים' },
  { email: 'bnsymwlydn2@gmail.com', name: 'עידן' },
  { email: 'tosef21me@gmail.com', name: 'יוסף חיים' },
];

const WHATSAPP_NUMBERS = [
  'whatsapp:+972584877770', // נסים
  'whatsapp:+972549101771', // עידן
  'whatsapp:+972525175536', // יוסף חיים
  'whatsapp:+972552722228', // החנות
];

const ORDER_TYPE_LABELS: Record<string, string> = {
  judaica: 'יודאיקה',
  stam: 'סת"מ',
  mixed: 'מעורב',
};

async function sendWhatsApp(payload: NotifyPayload) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!sid || !token) {
    console.warn('Twilio credentials not set — skipping WhatsApp');
    return;
  }

  const { type, customerName, total, orderType, orderId } = payload;

  let emoji = '🛍️';
  let title = 'הזמנה חדשה!';
  if (type === 'delayed') { emoji = '⚠️'; title = 'הזמנה מאוחרת!'; }
  if (type === 'blocked')  { emoji = '🚨'; title = 'הזמנה חסומה!'; }
  if (type === 'completed') { emoji = '✅'; title = 'הזמנה הושלמה!'; }

  const typeLabel = ORDER_TYPE_LABELS[orderType || ''] || orderType || '—';
  const link = `https://your-sofer.com/ops/orders/${orderId}`;

  const body = [
    `${emoji} ${title}`,
    `👤 לקוח: ${customerName}`,
    total !== undefined ? `💰 סכום: ₪${total}` : null,
    `📦 סוג: ${typeLabel}`,
    `🔗 לטיפול: ${link}`,
  ].filter(Boolean).join('\n');

  const client = twilio(sid, token);

  await Promise.allSettled(
    WHATSAPP_NUMBERS.map((to) =>
      client.messages.create({ from, to, body })
    )
  );
}

type NotifyType = 'new_order' | 'delayed' | 'blocked' | 'completed';

interface NotifyPayload {
  type: NotifyType;
  orderNumber: string;
  orderId: string;
  customerName: string;
  total?: number;
  products?: { name: string; quantity: number; price: number }[];
  shippingAddress?: { street: string; city: string; zip: string };
  orderType?: string;
  reason?: string;
}

function buildSubject(payload: NotifyPayload): string {
  const { type, orderNumber, customerName, total } = payload;
  switch (type) {
    case 'new_order':
      return `🛍️ הזמנה חדשה #${orderNumber} — ${customerName} — ₪${total}`;
    case 'delayed':
      return `⚠️ הזמנה מאוחרת #${orderNumber} — ${customerName}`;
    case 'blocked':
      return `🚨 הזמנה חסומה #${orderNumber} — ${customerName}`;
    case 'completed':
      return `✅ הזמנה הושלמה #${orderNumber} — ${customerName}`;
  }
}

function buildBody(payload: NotifyPayload): string {
  const { type, orderNumber, orderId, customerName, total, products, shippingAddress, orderType, reason } = payload;
  const orderLink = `https://your-sofer.com/ops/orders/${orderId}`;

  const productsHtml = products?.map(p =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">${p.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${p.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;">₪${p.price}</td>
    </tr>`
  ).join('') || '';

  const addressStr = shippingAddress
    ? `${shippingAddress.street}, ${shippingAddress.city} ${shippingAddress.zip}`
    : '—';

  const typeLabels: Record<string, string> = {
    judaica: 'יודאיקה',
    stam: 'סת"מ',
    mixed: 'מעורב',
  };

  let headerColor = '#0c1a35';
  let headerText = '';
  let alertBox = '';

  if (type === 'new_order') {
    headerText = `🛍️ הזמנה חדשה #${orderNumber}`;
  } else if (type === 'delayed') {
    headerColor = '#b45309';
    headerText = `⚠️ הזמנה מאוחרת #${orderNumber}`;
    alertBox = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:20px;">
      <strong>סיבת העיכוב:</strong> ${reason || 'לא צוין'}
    </div>`;
  } else if (type === 'blocked') {
    headerColor = '#991b1b';
    headerText = `🚨 הזמנה חסומה #${orderNumber}`;
    alertBox = `<div style="background:#fee2e2;border:1px solid #ef4444;border-radius:8px;padding:16px;margin-bottom:20px;">
      <strong>סיבת החסימה:</strong> ${reason || 'לא צוין'}
    </div>`;
  } else if (type === 'completed') {
    headerColor = '#15803d';
    headerText = `✅ הזמנה הושלמה #${orderNumber}`;
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:${headerColor};padding:24px;text-align:center;">
      <h1 style="color:#b8972a;margin:0;font-size:22px;">✡ Your Sofer — מערכת פנימית</h1>
      <p style="color:#fff;margin:10px 0 0;font-size:18px;font-weight:bold;">${headerText}</p>
    </div>
    <div style="padding:32px;">
      ${alertBox}
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#666;width:130px;">לקוח</td><td style="padding:6px 0;font-weight:bold;">${customerName}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">סוג הזמנה</td><td style="padding:6px 0;">${typeLabels[orderType || ''] || '—'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">כתובת</td><td style="padding:6px 0;">${addressStr}</td></tr>
        ${total !== undefined ? `<tr><td style="padding:6px 0;color:#666;">סה"כ</td><td style="padding:6px 0;font-weight:bold;color:#15803d;">₪${total}</td></tr>` : ''}
      </table>

      ${products && products.length > 0 ? `
      <h3 style="color:#0c1a35;margin:0 0 12px;font-size:16px;">מוצרים</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#0c1a35;color:#fff;">
            <th style="padding:8px 12px;text-align:right;">שם</th>
            <th style="padding:8px 12px;text-align:center;">כמות</th>
            <th style="padding:8px 12px;text-align:right;">מחיר</th>
          </tr>
        </thead>
        <tbody>${productsHtml}</tbody>
      </table>` : ''}

      <div style="text-align:center;margin-top:24px;">
        <a href="${orderLink}" style="background:#0c1a35;color:#b8972a;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          פתח הזמנה במערכת
        </a>
      </div>
    </div>
    <div style="background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888;">
      © 2025 Your Sofer · מערכת ניהול פנימית
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const payload: NotifyPayload = await req.json();
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const subject = buildSubject(payload);
    const html = buildBody(payload);
    const toEmails = TEAM.map((t) => t.email);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Your Sofer Ops <noreply@your-sofer.com>',
        to: toEmails,
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend error');

    // WhatsApp (non-fatal — don't block email success if WA fails)
    try {
      await sendWhatsApp(payload);
    } catch (waErr) {
      console.error('WhatsApp notify error (non-fatal):', waErr);
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('Notify team error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

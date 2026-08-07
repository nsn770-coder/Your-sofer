import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'nsn770@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, cartItems, cartTotal, sessionId } = await req.json();

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const itemsHtml = Array.isArray(cartItems)
      ? cartItems.map((item: any) =>
          `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;">${item.name}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #eee;">₪${item.price}</td>
          </tr>`
        ).join('')
      : '';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#92400e;padding:24px;text-align:center;">
      <h1 style="color:#fcd34d;margin:0;font-size:22px;">✡ Your Sofer</h1>
      <p style="color:#fff;margin:10px 0 0;font-size:18px;font-weight:bold;">⚠️ עגלה ננטשת — פרטים חלקיים</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#555;margin:0 0 20px;line-height:1.6;">לקוח התחיל למלא פרטים בדף התשלום אך לא השלים את ההזמנה. מומלץ לחזור אליו.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#666;width:130px;">שם</td><td style="padding:8px 0;font-weight:bold;">${name || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">טלפון</td><td style="padding:8px 0;font-weight:bold;font-size:16px;">${phone || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">אימייל</td><td style="padding:8px 0;">${email || '—'}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">סה"כ עגלה</td><td style="padding:8px 0;font-weight:bold;color:#15803d;">₪${cartTotal ?? 0}</td></tr>
      </table>

      ${Array.isArray(cartItems) && cartItems.length > 0 ? `
      <h3 style="color:#3B3B41;margin:0 0 12px;font-size:16px;">מוצרים בעגלה</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#3B3B41;color:#fff;">
            <th style="padding:8px 12px;text-align:right;">שם מוצר</th>
            <th style="padding:8px 12px;text-align:center;">כמות</th>
            <th style="padding:8px 12px;text-align:right;">מחיר</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>` : ''}

      <div style="text-align:center;margin-top:24px;">
        <a href="https://your-sofer.com/admin" style="background:#3B3B41;color:#C5A028;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          פתח לוח ניהול
        </a>
      </div>
    </div>
    <div style="background:#f0f0f0;padding:14px;text-align:center;font-size:11px;color:#aaa;">
      Session: ${sessionId ?? '—'} · © 2025 Your Sofer
    </div>
  </div>
</body>
</html>`;

    const contactInfo = [name, phone, email].filter(Boolean).join(' / ');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Your Sofer <noreply@your-sofer.com>',
        to: [ADMIN_EMAIL],
        subject: `⚠️ עגלה ננטשת — ${contactInfo || 'אנונימי'} · ₪${cartTotal ?? 0}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Resend error');

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('[notify-abandoned-cart] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

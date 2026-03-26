import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { customerEmail, customerName, orderNumber, items, total, address } = await req.json();

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const itemsHtml = items?.map((item: any) =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:left;">₪${item.price}</td>
      </tr>`
    ).join('') || '';

    const customerHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#0c1a35;padding:24px;text-align:center;">
      <h1 style="color:#b8972a;margin:0;font-size:24px;">✡ Your Sofer</h1>
      <p style="color:#fff;margin:8px 0 0;font-size:14px;">סת"מ ישירות מהסופר</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#0c1a35;margin:0 0 16px;">שלום ${customerName},</h2>
      <p style="color:#555;line-height:1.6;">תודה על הזמנתך! קיבלנו את הזמנה מספר <strong>${orderNumber}</strong> ונטפל בה בהקדם.</p>
      
      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:24px 0;">
        <h3 style="color:#0c1a35;margin:0 0 16px;font-size:16px;">פרטי ההזמנה</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#0c1a35;color:#fff;">
              <th style="padding:10px;text-align:right;">מוצר</th>
              <th style="padding:10px;text-align:center;">כמות</th>
              <th style="padding:10px;text-align:left;">מחיר</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align:left;margin-top:16px;font-size:18px;font-weight:bold;color:#0c1a35;">
          סה"כ: ₪${total}
        </div>
      </div>

      ${address ? `<p style="color:#555;"><strong>כתובת למשלוח:</strong> ${address}</p>` : ''}
      
      <p style="color:#555;line-height:1.6;">לשאלות ניתן לפנות אלינו בוואטסאפ: <a href="https://wa.me/972584877770" style="color:#b8972a;">058-4877770</a></p>
    </div>
    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:12px;color:#888;">
      © 2025 Your Sofer · yoursofer.com
    </div>
  </div>
</body>
</html>`;

    const adminHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;padding:20px;">
  <h2>🛒 הזמנה חדשה! #${orderNumber}</h2>
  <p><strong>לקוח:</strong> ${customerName}</p>
  <p><strong>אימייל:</strong> ${customerEmail}</p>
  <p><strong>סכום:</strong> ₪${total}</p>
  ${address ? `<p><strong>כתובת:</strong> ${address}</p>` : ''}
  <hr/>
  <p><strong>פריטים:</strong></p>
  ${items?.map((i: any) => `<p>• ${i.name} × ${i.quantity} = ₪${i.price * i.quantity}</p>`).join('') || ''}
  <br/>
  <a href="https://your-sofer.com/admin">פתח דשבורד</a>
</body>
</html>`;

    // שלח מייל ללקוח
    const customerRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Your Sofer <noreply@your-sofer.com>',
        to: [customerEmail],
        subject: `✅ אישור הזמנה #${orderNumber} — Your Sofer`,
        html: customerHtml,
      }),
    });

    // שלח מייל לאדמין
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Your Sofer <noreply@your-sofer.com>',
        to: ['nsn770@gmail.com'],
        subject: `🛒 הזמנה חדשה #${orderNumber} — ${customerName}`,
        html: adminHtml,
      }),
    });

    const data = await customerRes.json();
    return NextResponse.json({ success: true, id: data.id });

  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

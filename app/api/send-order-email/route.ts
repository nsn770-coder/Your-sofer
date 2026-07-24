import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { customerEmail, customerName, orderNumber, items, total, address, phone } = await req.json();

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const itemsHtml = items?.map((item: any) =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}${item.threadColor ? `<br><span style="font-size:12px;color:#92400e;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.threadColor.hex};border:1px solid #ccc;vertical-align:middle;margin-left:5px;"></span>צבע חוט לרקמה: ${item.threadColor.id} - ${item.threadColor.name}</span>` : ''}</td>
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
    <div style="background:#1E3A8A;padding:24px;text-align:center;">
      <h1 style="color:#C5A028;margin:0;font-size:24px;">✡ Your Sofer</h1>
      <p style="color:#fff;margin:8px 0 0;font-size:14px;">סת"מ ישירות מהסופר</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1E3A8A;margin:0 0 16px;">שלום ${customerName},</h2>
      <p style="color:#555;line-height:1.6;">תודה על הזמנתך! קיבלנו את הזמנה מספר <strong>${orderNumber}</strong> ונטפל בה בהקדם.</p>
      
      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:24px 0;">
        <h3 style="color:#1E3A8A;margin:0 0 16px;font-size:16px;">פרטי ההזמנה</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1E3A8A;color:#fff;">
              <th style="padding:10px;text-align:right;">מוצר</th>
              <th style="padding:10px;text-align:center;">כמות</th>
              <th style="padding:10px;text-align:left;">מחיר</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align:left;margin-top:16px;font-size:18px;font-weight:bold;color:#1E3A8A;">
          סה"כ: ₪${total}
        </div>
      </div>

      ${address ? `<p style="color:#555;"><strong>כתובת למשלוח:</strong> ${address}</p>` : ''}

      <!-- הזמנה למועדון פרימיום — 10% חזרה רטרואקטיבית גם על ההזמנה הזו -->
      <div style="background:#111d3a;border-radius:10px;padding:24px;margin:24px 0;text-align:center;">
        <div style="color:#C5A028;font-size:18px;font-weight:bold;margin-bottom:8px;">🎁 בינתיים — קבל/י 10% חזרה על הרכישה הזו!</div>
        <p style="color:#e5e7eb;font-size:14px;line-height:1.7;margin:0 0 16px;">
          הצטרפ/י בחינם למועדון הפרימיום שלנו וקבל/י <strong style="color:#C5A028;">10% מסכום ההזמנה בנקודות</strong> —
          כל נקודה שווה 1 ₪ לקנייה הבאה. ההצטרפות בלחיצה אחת עם חשבון Google, והנקודות על ההזמנה הזו נכנסות מיד.
        </p>
        <a href="https://your-sofer.com/club" style="background:#C5A028;color:#111d3a;padding:13px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">
          הצטרפות למועדון בחינם ←
        </a>
      </div>

      <p style="color:#555;line-height:1.6;">לשאלות ניתן לפנות אלינו בוואטסאפ: <a href="https://wa.me/972587479933" style="color:#C5A028;">058-747-9933</a></p>
    </div>
    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:12px;color:#888;">
      © 2025 Your Sofer · your-sofer.com
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

    // ── SMS ללקוח דרך 019 — רץ רק אם הוגדרו מפתחות (SMS019_TOKEN + SMS019_USERNAME) ──
    // לא חוסם את זרימת ההזמנה: כישלון SMS נרשם ללוג בלבד.
    let smsSent = false;
    const SMS019_TOKEN    = process.env.SMS019_TOKEN;
    const SMS019_USERNAME = process.env.SMS019_USERNAME;
    const SMS019_SOURCE   = process.env.SMS019_SOURCE || 'YourSofer';
    if (SMS019_TOKEN && SMS019_USERNAME && phone) {
      try {
        const digits = String(phone).replace(/\D/g, '');
        const localPhone = digits.startsWith('972') ? '0' + digits.slice(3) : digits;
        if (localPhone.length >= 9) {
          const smsText =
            `שלום ${customerName || ''}, כאן Your Sofer ✡️\n` +
            `קיבלנו את הזמנתך #${orderNumber} ואנחנו כבר מטפלים בה.\n` +
            `בינתיים - הצטרפ/י בחינם למועדון הפרימיום וקבל/י 10% מסכום ההזמנה בחזרה בנקודות:\n` +
            `https://your-sofer.com/club\n` +
            `להסרה השב/י "הסר"`;
          const smsRes = await fetch('https://019sms.co.il/api', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SMS019_TOKEN}`,
            },
            body: JSON.stringify({
              sms: {
                user: { username: SMS019_USERNAME },
                source: SMS019_SOURCE,
                destinations: { phone: [{ _: localPhone }] },
                message: smsText,
              },
            }),
          });
          const smsData = await smsRes.json().catch(() => null);
          smsSent = smsRes.ok;
          if (!smsRes.ok) console.error('[send-order-email] 019 SMS failed:', smsRes.status, smsData);
        }
      } catch (smsErr) {
        console.error('[send-order-email] 019 SMS error (non-fatal):', smsErr);
      }
    }

    const data = await customerRes.json();
    return NextResponse.json({ success: true, id: data.id, smsSent });

  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

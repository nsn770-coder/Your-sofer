import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F6F1;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1E3A8A;padding:28px 32px;text-align:center;">
      <div style="font-size:13px;color:rgba(255,255,255,0.65);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">מועדון לקוחות</div>
      <h1 style="margin:0;color:#C5A028;font-size:26px;font-weight:900;">✡ Your Sofer</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">סת״מ ישירות מהסופר</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 32px 28px;">
      <h2 style="color:#1E3A8A;font-size:21px;margin:0 0 10px;">ברוכים הבאים למועדון YourSofer! 🎉</h2>
      <p style="color:#444;font-size:14px;line-height:1.75;margin:0 0 24px;">
        שמחים שהצטרפתם אלינו. כחברי המועדון תקבלו:
      </p>

      <!-- Benefits -->
      <div style="background:#EFF6FF;border-right:4px solid #2563EB;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
        <div style="color:#1E3A8A;font-size:14px;font-weight:700;margin-bottom:8px;">ההטבות שלכם:</div>
        <div style="color:#333;font-size:13px;line-height:2;">
          ✅ 10% הנחה על הרכישה הראשונה (קוד למטה)<br/>
          ✅ 10% הנחה קבועה על כל רכישה עתידית<br/>
          ✅ עדכונים ראשונים על מוצרים ומבצעים חדשים
        </div>
      </div>

      <!-- Coupon -->
      <p style="color:#444;font-size:14px;margin:0 0 12px;">הנה קוד ההנחה שלכם ל-10% על הרכישה הראשונה:</p>
      <div style="border:2px dashed #2563EB;border-radius:10px;padding:16px;text-align:center;margin-bottom:24px;background:#F8FAFF;">
        <div style="font-size:24px;font-weight:900;color:#1E3A8A;letter-spacing:3px;direction:ltr;">AM_ISRAEL_CHAI10</div>
        <div style="font-size:12px;color:#666;margin-top:6px;">הכניסו את הקוד בשדה ״קוד קופון״ בעמוד הקופה</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://your-sofer.com"
           style="background:#1E3A8A;color:#fff;text-decoration:none;border-radius:10px;padding:14px 36px;font-size:15px;font-weight:800;display:inline-block;">
          לקנייה עכשיו ←
        </a>
      </div>

      <p style="color:#888;font-size:12px;line-height:1.7;margin:0;">
        לשאלות ניתן לפנות אלינו בוואטסאפ:
        <a href="https://wa.me/972584877770" style="color:#2563EB;text-decoration:none;">058-487-7770</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#F0F0F0;padding:16px 32px;text-align:center;font-size:11px;color:#999;">
      © 2025 Your Sofer · your-sofer.com<br/>
      קיבלתם מייל זה כי נרשמתם למועדון YourSofer.
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'Your Sofer <noreply@your-sofer.com>',
        to:      [email],
        subject: '🎉 ברוכים הבאים למועדון YourSofer — קוד ההנחה שלכם מחכה',
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[send-club-welcome] Resend error:', err);
      return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, id: data.id });

  } catch (error) {
    console.error('[send-club-welcome]', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

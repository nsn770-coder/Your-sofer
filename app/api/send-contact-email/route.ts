import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
    }

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;padding:20px;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#0c1a35;padding:24px;text-align:center;">
      <h1 style="color:#C5A028;margin:0;font-size:22px;">✡ Your Sofer — פנייה חדשה</h1>
    </div>
    <div style="padding:28px;">
      <p><strong>שם:</strong> ${name}</p>
      <p><strong>אימייל:</strong> <a href="mailto:${email}">${email}</a></p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;"/>
      <p><strong>הודעה:</strong></p>
      <p style="background:#f9f9f9;padding:16px;border-radius:8px;white-space:pre-wrap;line-height:1.6;">${message}</p>
    </div>
    <div style="background:#f0f0f0;padding:14px;text-align:center;font-size:12px;color:#888;">
      © 2025 Your Sofer · your-sofer.com
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
        from: 'Your Sofer <noreply@your-sofer.com>',
        to: ['cteend7@gmail.com'],
        reply_to: email,
        subject: `📩 פנייה חדשה מ-${name} — Your Sofer`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

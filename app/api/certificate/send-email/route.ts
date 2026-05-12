import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';

export async function POST(req: NextRequest) {
  try {
    const { certId } = await req.json();
    if (!certId) return NextResponse.json({ error: 'certId required' }, { status: 400 });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 500 });

    const snap = await getDoc(doc(db, 'certificates', certId));
    if (!snap.exists()) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });

    const cert = snap.data() as {
      certId: string;
      customerName: string;
      customerEmail: string;
      externalOrderId: string;
      magiaName: string;
      items: { serialNumber: string; productName: string; type: string; qualityLevel: string }[];
    };

    if (!cert.customerEmail) {
      return NextResponse.json({ error: 'No customer email on certificate' }, { status: 400 });
    }

    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://your-sofer.com';
    const certUrl = `${BASE_URL}/certificate/${certId}`;
    const verifyUrl = `${BASE_URL}/verify/${certId}`;

    const itemsHtml = cert.items.map(item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece0;font-family:monospace;font-weight:700;color:#0c1a35;white-space:nowrap;">${item.serialNumber}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece0;">${item.productName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece0;white-space:nowrap;">${item.type}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0ece0;color:#15803d;font-weight:600;">${item.qualityLevel}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0c1a35 0%,#18274a 100%);padding:28px 32px;text-align:center;border-bottom:3px solid #C5A028;">
      <div style="font-size:28px;color:#C5A028;margin-bottom:6px;">✡</div>
      <div style="font-size:13px;font-weight:700;letter-spacing:0.2em;color:#fff;text-transform:uppercase;">Your Sofer</div>
      <div style="font-size:22px;font-weight:900;color:#C5A028;margin-top:10px;">תעודת כשרות סת״מ</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:4px;">Certificate of Kashrut</div>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="font-size:16px;color:#0c1a35;font-weight:700;margin:0 0 6px;">שלום ${cert.customerName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 24px;">
        תעודת הכשרות עבור הזמנתך מספר <strong>${cert.externalOrderId?.slice(-8)?.toUpperCase() ?? certId.slice(-8)}</strong> מוכנה.
        כל הפריטים נבדקו ואושרו כדת וכדין על ידי מגיה מוסמך.
      </p>

      <!-- Items table -->
      <div style="margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#0c1a35;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em;">פריטים מאושרים</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#0c1a35;color:#fff;">
              <th style="padding:8px 12px;text-align:right;font-weight:700;">מס׳ סידורי</th>
              <th style="padding:8px 12px;text-align:right;font-weight:700;">מוצר</th>
              <th style="padding:8px 12px;text-align:right;font-weight:700;">סוג</th>
              <th style="padding:8px 12px;text-align:right;font-weight:700;">כשרות</th>
            </tr>
          </thead>
          <tbody style="background:#fffdf8;">${itemsHtml}</tbody>
        </table>
      </div>

      <!-- Magia badge -->
      <div style="background:linear-gradient(90deg,#111d3a,#18274a);border:1px solid rgba(197,160,40,0.35);border-radius:10px;padding:12px 18px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:18px;color:#C5A028;">✓</span>
        <div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);">נבדק ואושר על ידי</div>
          <div style="font-size:14px;color:#C5A028;font-weight:800;">${cert.magiaName}</div>
        </div>
      </div>

      <!-- CTA buttons -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${certUrl}" style="display:inline-block;background:#C5A028;color:#0c1a35;text-decoration:none;border-radius:10px;padding:13px 32px;font-weight:900;font-size:15px;margin-left:8px;">
          📜 צפייה בתעודה המלאה
        </a>
      </div>
      <div style="text-align:center;margin-bottom:16px;">
        <a href="${verifyUrl}" style="font-size:12px;color:#888;text-decoration:underline;">לאימות התעודה: ${verifyUrl}</a>
      </div>

      <!-- Cert ID -->
      <div style="background:#f8f6f2;border-radius:8px;padding:12px 16px;text-align:center;">
        <div style="font-size:10px;color:#aaa;margin-bottom:4px;">מספר תעודה</div>
        <div style="font-family:monospace;font-size:15px;font-weight:900;color:#0c1a35;letter-spacing:0.06em;">${certId}</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f0f0f0;padding:16px 32px;text-align:center;font-size:11px;color:#999;">
      © 2025 Your Sofer · your-sofer.com · כל הזכויות שמורות
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Your Sofer <shop@your-sofer.com>',
        to: [cert.customerEmail],
        subject: `📜 תעודת הכשרות שלך — הזמנה #${cert.externalOrderId?.slice(-8)?.toUpperCase() ?? certId.slice(-8)}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.message ?? 'Resend error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Certificate send-email error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

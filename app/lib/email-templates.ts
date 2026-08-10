// ── Phase 14C: shared HTML email templates ───────────────────────────────────
// Mirrors the layout/branding used in app/api/send-order-email/route.ts and
// app/api/ops/notify-team/route.ts (RTL, #1E3A8A / #C5A028 brand colors).

export interface EmailOrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface PartnerNewOrderParams {
  orderNumber: string;
  orderId: string;
  customerName: string;
  deliveryAddress: string;
  items: EmailOrderItem[];
}

interface CustomerShipmentParams {
  orderNumber: string;
  customerName: string;
  trackingLink: string;
  publicId: string;
}

function itemRows(items: EmailOrderItem[]): string {
  return items
    .map(
      (item) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:left;">₪${item.price}</td>
      </tr>`
    )
    .join('');
}

export function renderPartnerNewOrderTemplate({
  orderNumber,
  orderId,
  customerName,
  deliveryAddress,
  items,
}: PartnerNewOrderParams): string {
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1E3A8A;padding:24px;text-align:center;">
      <h1 style="color:#C5A028;margin:0;font-size:22px;">✡ Your Sofer — הזמנה חדשה</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1E3A8A;margin:0 0 16px;">הזמנה חדשה!</h2>
      <p style="color:#555;line-height:1.6;">קיבלת הזמנה חדשה בחנות שלך.</p>
      <p style="color:#555;"><strong>מספר הזמנה:</strong> ${orderNumber}</p>

      <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:24px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1E3A8A;color:#fff;">
              <th style="padding:10px;text-align:right;">מוצר</th>
              <th style="padding:10px;text-align:center;">כמות</th>
              <th style="padding:10px;text-align:left;">מחיר</th>
            </tr>
          </thead>
          <tbody>${itemRows(items)}</tbody>
        </table>
        <div style="text-align:left;margin-top:16px;font-size:18px;font-weight:bold;color:#1E3A8A;">
          סך הכל: ₪${total.toFixed(2)}
        </div>
      </div>

      ${deliveryAddress ? `<p style="color:#555;"><strong>כתובת משלוח:</strong> ${deliveryAddress}</p>` : ''}
      <p style="color:#555;line-height:1.6;">אנא וודא שהמוצרים זמינים במחסן שלך ומוכנים לאיסוף.</p>

      <div style="text-align:center;margin-top:24px;">
        <a href="https://your-sofer.com/partner/orders/${orderId}" style="background:#1E3A8A;color:#C5A028;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          צפה בהזמנה בדשבורד
        </a>
      </div>
    </div>
    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:12px;color:#888;">
      © 2025 Your Sofer · your-sofer.com
    </div>
  </div>
</body>
</html>`;
}

export function renderCustomerShipmentTemplate({
  orderNumber,
  customerName,
  trackingLink,
  publicId,
}: CustomerShipmentParams): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#1E3A8A;padding:24px;text-align:center;">
      <h1 style="color:#C5A028;margin:0;font-size:24px;">✡ Your Sofer</h1>
      <p style="color:#fff;margin:8px 0 0;font-size:14px;">משלוח בדרך 🚚</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#1E3A8A;margin:0 0 16px;">שלום ${customerName},</h2>
      <p style="color:#555;line-height:1.6;">הזמנה <strong>${orderNumber}</strong> שלך יצאה למשלוח עם Lionwheel.</p>
      <p style="color:#555;"><strong>מספר מעקב:</strong> ${publicId}</p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${trackingLink}" style="background:#C5A028;color:#111d3a;padding:13px 32px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;display:inline-block;">
          עקוב אחרי המשלוח ←
        </a>
      </div>

      <p style="color:#555;line-height:1.6;">תודה על הקנייה!</p>
      <p style="color:#555;line-height:1.6;">לשאלות ניתן לפנות אלינו בוואטסאפ: <a href="https://wa.me/972587479933" style="color:#C5A028;">058-747-9933</a></p>
    </div>
    <div style="background:#f0f0f0;padding:16px;text-align:center;font-size:12px;color:#888;">
      © 2025 Your Sofer · your-sofer.com
    </div>
  </div>
</body>
</html>`;
}

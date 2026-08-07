'use client';

import { useEffect, useState } from 'react';
import { SHIPPING } from '@/app/config/siteTrust';

/**
 * AnnouncementBar — פס הטבה דק וקבוע בראש האתר, מעל ה-NavBar.
 *
 * • שני מסרים מתחלפים כל 4 שניות עם fade עדין.
 * • ללא כפתור סגירה (מוצג תמיד, בכל העמודים, גם במובייל).
 * • סף המשלוח נקרא מ-siteTrust (SHIPPING.freeShippingThreshold) — מקור אמת יחיד
 *   שמסונכרן עם FREE_SHIPPING_THRESHOLD ב-CartContext. אין לכתוב כאן מספר קשיח.
 * • המסר השני פותח את ClubPopup הקיים דרך אירוע window ('ys:open-club').
 *
 * CLS: הגובה קבוע (36px) ומוצהר גם ב-SSR, והפס נמצא בזרימת המסמך מעל
 * ה-header ה-sticky — אין קפיצת פריסה כשה-JS עולה.
 */

/** KEEP IN SYNC with components/ClubPopup.tsx + ClubPopupWrapper.tsx */
const OPEN_CLUB_EVENT = 'ys:open-club';

const BAR_BG = 'var(--ys-plum)'; // שזיף המותג
const COUPON_CODE = 'ברכה5';
const BAR_H = 36;
const ROTATE_MS = 4000;
const FADE_MS = 400;

type Msg = { text: string; action?: () => void; ariaLabel?: string };

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyCoupon() {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard לא זמין — נכשל בשקט */ }
  }

  const messages: Msg[] = [
    {
      text: `🚚 משלוח חינם בהזמנה מעל ₪${SHIPPING.freeShippingThreshold}`,
    },
    {
      text: '🎁 5% הנחה + 10% בנקודות למצטרפים למועדון — לחצו כאן',
      ariaLabel: 'הצטרפות למועדון הלקוחות — פתיחת טופס ההרשמה',
      action: () => window.dispatchEvent(new Event(OPEN_CLUB_EVENT)),
    },
    {
      // אוחד לכאן מ-CouponStrip (08/2026): שתי רצועות פרסום זו מעל זו תפסו
      // 72px בראש כל עמוד. לחיצה מעתיקה את הקוד, במקום כפתור "העתק" נפרד.
      text: copied
        ? `✓ הקוד ${COUPON_CODE} הועתק!`
        : `🏷️ קוד קופון ${COUPON_CODE} — 5% הנחה, לחצו להעתקה`,
      ariaLabel: `העתקת קוד הקופון ${COUPON_CODE}`,
      action: copyCoupon,
    },
  ];
  const MSG_COUNT = messages.length;

  useEffect(() => {
    // נגישות: מכבדים prefers-reduced-motion — בלי החלפה אוטומטית ובלי fade.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex(i => (i + 1) % MSG_COUNT);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, []);

  const msg = messages[index];

  const content = (
    <span
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        display: 'inline-block',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}
    >
      {msg.text}
    </span>
  );

  return (
    <div
      dir="rtl"
      style={{
        background: BAR_BG,
        color: '#ffffff',
        height: BAR_H,
        minHeight: BAR_H,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 12px',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.01em',
        lineHeight: 1,
        overflow: 'hidden',
      }}
    >
      {/* קוראי מסך: מקבלים את שני המסרים פעם אחת, בלי הכרזה חוזרת כל 4 שניות */}
      <span className="sr-only">
        משלוח חינם בהזמנה מעל ₪{SHIPPING.freeShippingThreshold}. 5% הנחה ו-10% בנקודות למצטרפים למועדון. קוד קופון {COUPON_CODE} להנחה של 5%.
      </span>

      <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', maxWidth: '100%' }}>
        {msg.action ? (
          <button
            type="button"
            onClick={msg.action}
            aria-label={msg.ariaLabel}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              color: '#ffffff',
              font: 'inherit',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              textDecorationColor: 'rgba(255,255,255,0.5)',
              maxWidth: '100%',
            }}
          >
            {content}
          </button>
        ) : (
          content
        )}
      </span>
    </div>
  );
}

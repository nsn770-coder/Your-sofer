'use client';

import { useId, useState } from 'react';

/**
 * FaqSection — אקורדיון שאלות ותשובות נגיש, RTL, עם JSON-LD מסוג FAQPage.
 *
 * נגישות: כל שאלה היא <button aria-expanded aria-controls> בתוך כותרת,
 * התשובה היא region עם aria-labelledby. ניווט מקלדת מלא (Tab + Enter/Space).
 *
 * ⚠️ JSON-LD: גוגל דורש שהתוכן המסומן יהיה גלוי בעמוד. התשובות נמצאות ב-DOM
 * תמיד (נסגרות ב-CSS grid-template-rows), ולכן הסימון תקין.
 *
 * emitJsonLd=false — כשיש כמה FaqSection באותו עמוד, רק אחד מהם מסמן,
 * כדי לא לשדר FAQPage כפול לאותה כתובת.
 */

export interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  items: FaqItem[];
  title?: string;
  /** שידור JSON-LD מסוג FAQPage. ברירת מחדל: כן. */
  emitJsonLd?: boolean;
  /** רקע הסקשן — לבן כברירת מחדל */
  background?: string;
  /** האם הפריט הראשון פתוח בטעינה */
  defaultOpenFirst?: boolean;
}

const NAVY = '#373A5A';
const GOLD = 'var(--ys-accent)';

export default function FaqSection({
  items,
  title = 'שאלות ותשובות',
  emitJsonLd = true,
  background = '#FFFFFF',
  defaultOpenFirst = true,
}: Props) {
  const [open, setOpen] = useState<number | null>(defaultOpenFirst ? 0 : null);
  const uid = useId();

  if (!items.length) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };

  return (
    <section dir="rtl" style={{ background, padding: '48px 16px' }} aria-labelledby={`${uid}-title`}>
      {emitJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2
          id={`${uid}-title`}
          style={{ fontSize: 24, fontWeight: 700, color: NAVY, textAlign: 'center', marginBottom: 28, lineHeight: 1.3 }}
        >
          {title}
        </h2>

        <div style={{ borderTop: '1px solid #E7E2D8' }}>
          {items.map((it, i) => {
            const isOpen = open === i;
            const btnId = `${uid}-q-${i}`;
            const panelId = `${uid}-a-${i}`;
            return (
              <div key={i} style={{ borderBottom: '1px solid #E7E2D8' }}>
                <h3 style={{ margin: 0 }}>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '18px 4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'right',
                      font: 'inherit',
                      fontSize: 16,
                      fontWeight: 600,
                      color: isOpen ? GOLD : NAVY,
                      lineHeight: 1.45,
                      transition: 'color 0.15s',
                    }}
                  >
                    <span style={{ flex: 1 }}>{it.q}</span>
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        fontSize: 13,
                        color: GOLD,
                        transition: 'transform 0.22s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        lineHeight: 1,
                      }}
                    >
                      ▾
                    </span>
                  </button>
                </h3>

                {/* grid-template-rows 0fr→1fr = אנימציית פתיחה חלקה בלי גובה קשיח */}
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  style={{
                    display: 'grid',
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.24s ease',
                  }}
                >
                  {/* visibility מוציא את הטקסט הסגור מעץ הנגישות — בלי זה קורא
                      מסך היה מקריא את כל התשובות ברצף גם כשהן סגורות ויזואלית */}
                  <div style={{ overflow: 'hidden', visibility: isOpen ? 'visible' : 'hidden' }}>
                    <p
                      style={{
                        margin: 0,
                        padding: '0 4px 18px',
                        fontSize: 15,
                        lineHeight: 1.75,
                        color: '#4A4A4A',
                      }}
                    >
                      {it.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

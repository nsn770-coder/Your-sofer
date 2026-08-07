'use client';

/**
 * FaqAccordion — אקורדיון שאלות ותשובות נגיש, לשימוש חוזר.
 *
 * משמש גם את דף ה-FAQ המרכזי (/faq) וגם את אזורי ה-FAQ הממוקדים בעמודים.
 * נגישות: button אמיתי, aria-expanded, aria-controls, תמיכה מלאה במקלדת.
 * הפתיחה בטרנזיציית grid-rows — ללא max-height קשיח וללא קפיצות בעמוד.
 */

import { useState, useId } from 'react';
import { usePathname } from 'next/navigation';
import type { FAQItem, FaqCta } from '@/data/faq';
import { trackFaqEvent, type FaqEventName } from '@/lib/faqAnalytics';

function ctaEventName(cta: FaqCta): FaqEventName | null {
  if (cta.type === 'whatsapp') return 'faq_whatsapp_click';
  if (cta.href.startsWith('/account')) return 'faq_order_status_click';
  if (cta.href.startsWith('/event-kippot') || cta.href.startsWith('/kippot-order')) return 'faq_start_design_click';
  return null;
}

function CtaButton({ cta, questionId }: { cta: FaqCta; questionId: string }) {
  const pathname = usePathname();
  const isWa = cta.type === 'whatsapp';
  return (
    <a
      href={cta.href}
      target={isWa ? '_blank' : undefined}
      rel={isWa ? 'noopener noreferrer' : undefined}
      onClick={() => {
        const ev = ctaEventName(cta);
        if (ev) trackFaqEvent(ev, { question_id: questionId, page: pathname ?? undefined });
      }}
      style={{
        display: 'inline-block',
        marginTop: 10,
        background: isWa ? '#25D366' : '#1a1a1a',
        color: '#fff',
        padding: '9px 18px',
        borderRadius: 8,
        fontSize: 13.5,
        fontWeight: 700,
        textDecoration: 'none',
      }}
    >
      {cta.label} ←
    </a>
  );
}

export default function FaqAccordion({
  items,
  compact = false,
}: {
  items: FAQItem[];
  /** compact — לאזורי FAQ ממוקדים בעמודים (טיפוגרפיה מעט קטנה יותר) */
  compact?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const pathname = usePathname();
  const uid = useId();

  function toggle(item: FAQItem) {
    const next = openId === item.id ? null : item.id;
    setOpenId(next);
    if (next) {
      trackFaqEvent('faq_question_open', {
        question_id: item.id,
        category: item.category,
        page: pathname ?? undefined,
      });
    }
  }

  return (
    <div
      dir="rtl"
      style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, overflow: 'hidden' }}
    >
      {items.map((item, i) => {
        const open = openId === item.id;
        const panelId = `${uid}-panel-${item.id}`;
        const btnId = `${uid}-btn-${item.id}`;
        return (
          <div key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #E0D8CC' : 'none' }}>
            <h3 style={{ margin: 0 }}>
              <button
                id={btnId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: compact ? '13px 14px' : '15px 16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'right',
                  fontFamily: 'inherit',
                  minHeight: 48, // אזור לחיץ רחב — נגישות מגע
                }}
              >
                <span style={{
                  fontSize: compact ? 14 : 15,
                  fontWeight: 600,
                  color: 'var(--ys-text)',
                  flex: 1,
                  lineHeight: 1.5,
                }}>
                  {item.question}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  stroke="var(--ys-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'none' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              style={{
                display: 'grid',
                gridTemplateRows: open ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.25s ease, visibility 0.25s',
                visibility: open ? 'visible' : 'hidden',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontSize: compact ? 13.5 : 14,
                  color: '#444',
                  lineHeight: 1.8,
                  padding: compact ? '10px 14px 14px' : '12px 16px 16px',
                  background: '#F8F5F0',
                  whiteSpace: 'pre-line',
                }}>
                  {item.fullAnswer}
                  {item.cta && (
                    <div>
                      <CtaButton cta={item.cta} questionId={item.id} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

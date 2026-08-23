'use client';

/**
 * PageFaqSection — אזור FAQ ממוקד להטמעה בעמודים רלוונטיים.
 *
 * מציג 4–8 שאלות מתוך מקור האמת המרכזי (data/faq.ts) לפי pageKey,
 * עם קישור לדף ה-FAQ המלא ו-CTA אופציונליים.
 * שימוש: <PageFaqSection pageKey="event-kippot" />
 */

import { usePathname } from 'next/navigation';
import { getFaqForPage, getFaqByIds, type FaqPageKey } from '@/data/faq';
import { buildWhatsAppLink, WA_PREFILL } from '@/lib/whatsapp';
import { trackFaqEvent } from '@/lib/faqAnalytics';
import FaqAccordion from './FaqAccordion';
import { useT } from '@/app/lib/i18n/useT';

export default function PageFaqSection({
  pageKey,
  title = 'שאלות נפוצות',
  max = 8,
  showStartDesignCta = false,
  startDesignHref = '/event-kippot',
  showWhatsAppCta = true,
  ids,
  emitJsonLd = true,
}: {
  pageKey: FaqPageKey;
  title?: string;
  max?: number;
  /** רשימת מזהים מפורשת — גוברת על pageKey וקובעת גם את הסדר */
  ids?: string[];
  /** שידור JSON-LD מסוג FAQPage. לכבות אם יש עוד סקשן FAQ באותה כתובת. */
  emitJsonLd?: boolean;
  /** CTA ראשי "התחילו לעצב את הכיפות שלכם" (לעמודי כיפות) */
  showStartDesignCta?: boolean;
  /** יעד ה-CTA הראשי */
  startDesignHref?: string;
  /** CTA משני לוואטסאפ */
  showWhatsAppCta?: boolean;
}) {
  const { dir } = useT();
  const pathname = usePathname();
  const items = ids?.length ? getFaqByIds(ids) : getFaqForPage(pageKey, max);
  if (items.length === 0) return null;

  // FAQPage — fullAnswer הוא הטקסט שמוצג בפועל באקורדיון, ולכן זה הטקסט
  // שנכנס לסימון. \n מומר לרווח: הסכימה מצפה למחרוזת אחת רציפה.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(it => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.fullAnswer.replace(/\n+/g, ' ') },
    })),
  };

  return (
    <section
      dir={dir}
      aria-label={title}
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '36px 16px 44px',
        fontFamily: "'Heebo', Arial, sans-serif",
      }}
    >
      {emitJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ys-text)', margin: '0 0 16px', textAlign: 'center' }}>
        {title}
      </h2>

      <FaqAccordion items={items} compact />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 18 }}>
        {showStartDesignCta && (
          <a
            href={startDesignHref}
            onClick={() => trackFaqEvent('faq_start_design_click', { page: pathname ?? undefined })}
            style={{
              background: 'var(--ys-accent)', color: '#FEFBF7', padding: '11px 22px', borderRadius: 10,
              fontSize: 14, fontWeight: 800, textDecoration: 'none',
            }}
          >
            התחילו לעצב את הכיפות שלכם
          </a>
        )}
        {showWhatsAppCta && (
          <a
            href={buildWhatsAppLink(WA_PREFILL.general)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackFaqEvent('faq_whatsapp_click', { page: pathname ?? undefined })}
            style={{
              background: '#25D366', color: '#fff', padding: '11px 22px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
            }}
          >
            צריכים עזרה? דברו איתנו בוואטסאפ
          </a>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <a
          href="/faq"
          style={{ fontSize: 13.5, fontWeight: 700, color: '#9C7B3F', textDecoration: 'underline' }}
        >
          לכל השאלות והתשובות ←
        </a>
      </div>
    </section>
  );
}

'use client';

/**
 * FaqClient — דף השאלות והתשובות המרכזי.
 *
 * כל התוכן מגיע ממקור האמת היחיד data/faq.ts.
 * כולל: חיפוש בזמן אמת (עם נרמול עברית ומילות מפתח), כפתורי קטגוריות,
 * אקורדיונים נגישים, כפתור וואטסאפ וכפתור מעקב הזמנה.
 */

import { useMemo, useRef, useState } from 'react';
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  getFaqByCategory,
  searchFaq,
  type FaqCategoryId,
} from '@/data/faq';
import { buildWhatsAppLink, WA_PREFILL } from '@/lib/whatsapp';
import { trackFaqEvent } from '@/lib/faqAnalytics';
import FaqAccordion from '@/app/components/faq/FaqAccordion';

const GOLD = '#C5A028';

export default function FaqClient() {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<FaqCategoryId | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searching = query.trim().length > 0;
  const searchResults = useMemo(
    () => (searching ? searchFaq(query) : FAQ_ITEMS),
    [query, searching],
  );

  function onSearchChange(value: string) {
    setQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (value.trim().length >= 2) {
      searchDebounce.current = setTimeout(() => {
        trackFaqEvent('faq_search', {
          search_term: value.trim(),
          results_count: searchFaq(value).length,
          page: '/faq',
        });
      }, 700);
    }
  }

  function onCategoryClick(catId: FaqCategoryId) {
    setActiveCat(prev => (prev === catId ? null : catId));
    setQuery('');
    trackFaqEvent('faq_category_click', { category: catId, page: '/faq' });
    // גלילה עדינה לקטגוריה
    requestAnimationFrame(() => {
      document.getElementById(`faq-cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const visibleCategories = activeCat
    ? FAQ_CATEGORIES.filter(c => c.id === activeCat)
    : FAQ_CATEGORIES;

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#F5F2EC', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <div style={{ background: '#1a1a1a', padding: '48px 20px 40px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 900, margin: '0 0 10px' }}>
          שאלות נפוצות
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, margin: '0 auto', maxWidth: 640, lineHeight: 1.7 }}>
          מצאו תשובות מהירות לשאלות על כיפות בהדפסה אישית, משלוחים, הקדשות, מועדון הלקוחות,
          מוצרי סת״ם, סטטוס הזמנה, תשלומים והחזרות. לא מצאתם תשובה? ניתן לפנות אלינו ישירות
          בוואטסאפ ולקבל מענה אנושי מהיר.
        </p>

        {/* כפתורי פעולה עליונים */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <a
            href={buildWhatsAppLink(WA_PREFILL.general)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackFaqEvent('faq_whatsapp_click', { page: '/faq' })}
            style={{ background: '#25D366', color: '#fff', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            💬 וואטסאפ — מענה אנושי מהיר
          </a>
          <a
            href="/account"
            onClick={() => trackFaqEvent('faq_order_status_click', { page: '/faq' })}
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            מעקב אחר הזמנה / אזור אישי
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px 60px' }}>

        {/* ── חיפוש ── */}
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="faq-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            חיפוש בשאלות ותשובות
          </label>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="חפשו שאלה... (למשל: מחיר כיפות, משלוח, נקודות)"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `1.5px solid ${query ? GOLD : '#E0D8CC'}`,
              borderRadius: 12,
              padding: '13px 16px',
              fontSize: 15,
              fontFamily: 'inherit',
              outline: 'none',
              background: '#fff',
              color: '#1a1a1a',
            }}
          />
        </div>

        {/* ── כפתורי קטגוריות ── */}
        {!searching && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 26 }}>
            {FAQ_CATEGORIES.map(cat => {
              const active = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryClick(cat.id)}
                  aria-pressed={active}
                  style={{
                    background: active ? GOLD : '#fff',
                    color: active ? '#1a1a1a' : '#444',
                    border: `1.5px solid ${active ? GOLD : '#E0D8CC'}`,
                    borderRadius: 20,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    minHeight: 40,
                  }}
                >
                  <span aria-hidden="true" style={{ marginLeft: 5 }}>{cat.icon}</span>
                  {cat.label}
                </button>
              );
            })}
            {activeCat && (
              <button
                onClick={() => setActiveCat(null)}
                style={{
                  background: 'none', border: 'none', color: '#9C7B3F', fontSize: 13,
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
                }}
              >
                הצג הכל
              </button>
            )}
          </div>
        )}

        {/* ── תוצאות חיפוש ── */}
        {searching ? (
          <div>
            <div style={{ fontSize: 13.5, color: '#666', marginBottom: 12 }}>
              {searchResults.length > 0
                ? `נמצאו ${searchResults.length} תשובות עבור "${query.trim()}"`
                : `לא נמצאו תשובות עבור "${query.trim()}"`}
            </div>
            {searchResults.length > 0 ? (
              <FaqAccordion items={searchResults} />
            ) : (
              <div style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
                  לא מצאנו תשובה מתאימה
                </div>
                <div style={{ fontSize: 13.5, color: '#666', marginBottom: 16 }}>
                  נסו ניסוח אחר, או דברו איתנו ישירות — עונים מהר.
                </div>
                <a
                  href={buildWhatsAppLink(WA_PREFILL.general)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackFaqEvent('faq_whatsapp_click', { page: '/faq' })}
                  style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '11px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                >
                  שאלו אותנו בוואטסאפ ←
                </a>
              </div>
            )}
          </div>
        ) : (
          /* ── קטגוריות ── */
          visibleCategories.map(cat => {
            const items = getFaqByCategory(cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id} id={`faq-cat-${cat.id}`} aria-label={cat.label} style={{ marginBottom: 30, scrollMarginTop: 90 }}>
                <h2 style={{ fontSize: 19, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden="true" style={{ fontSize: 17 }}>{cat.icon}</span>
                  {cat.label}
                </h2>
                <FaqAccordion items={items} />
              </section>
            );
          })
        )}

        {/* ── לא מצאתם תשובה ── */}
        <div style={{ marginTop: 40, textAlign: 'center', background: '#fff', border: '1px solid #E0D8CC', borderRadius: 14, padding: '28px 24px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>לא מצאתם תשובה?</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            צרו איתנו קשר בוואטסאפ — בשעות הפעילות עונים בדרך כלל בתוך כדקה.
          </div>
          <a
            href={buildWhatsAppLink(WA_PREFILL.general)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackFaqEvent('faq_human_agent_click', { page: '/faq' })}
            style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '12px 28px', borderRadius: 8, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}
          >
            שלחו הודעה בוואטסאפ ←
          </a>
        </div>
      </div>
    </div>
  );
}

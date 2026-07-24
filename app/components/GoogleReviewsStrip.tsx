'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// רצועת ביקורות גוגל — מוצגת בכל עמוד מעל הפוטר.
// שולפת מ-/api/google-reviews (קאש 6 שעות). אם ה-API לא מוגדר —
// מציגה רק את כותרת המדור + כפתור "כתוב ביקורת".

interface GReview {
  author: string;
  avatar: string;
  rating: number;
  when: string;
  text: string;
  time: number;
}

interface GData {
  configured: boolean;
  rating?: number | null;
  total?: number;
  reviews: GReview[];
  writeUrl?: string;
  mapsUrl?: string;
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: '#fbbc04', fontSize: 16, letterSpacing: 1 }} aria-label={`${n} כוכבים`}>
      {'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}
    </span>
  );
}

function GIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

export default function GoogleReviewsStrip() {
  const pathname = usePathname();
  const [data, setData] = useState<GData | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/google-reviews')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (pathname?.startsWith('/admin/emails')) return null; // נטען כ-iframe באדמין
  if (!data || !data.writeUrl) return null;

  const hasReviews = data.configured && data.reviews.length > 0;

  return (
    <section dir="rtl" style={{ background: '#fff', borderTop: '1px solid #eee', padding: '40px 16px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 900, color: '#1a1a2e', marginBottom: 6 }}>
          הבמה שלכם...
        </h2>
        <p style={{ textAlign: 'center', fontSize: 15, color: '#555', marginBottom: 28 }}>
          החוויה שלכם היא ההשראה שלנו! קראו מה הלקוחות מספרים על המוצרים והשירות שלנו.
        </p>

        <div className="flex flex-col md:flex-row items-center md:items-start justify-center" style={{ gap: 16 }}>
          {/* סיכום + כתוב ביקורת — בדסקטופ בצד, במובייל שורה קטנה מתחת לכרטיסים */}
          <div className="order-2 md:order-1 w-full md:w-auto flex md:block items-center justify-center gap-4 md:text-center"
            style={{ padding: '10px 12px', flexShrink: 0 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                <GIcon />
                <span style={{ fontWeight: 800, fontSize: 15 }}>ביקורות Google</span>
              </div>
              {data.rating != null && (
                <div style={{ marginBottom: 2, textAlign: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 900, marginInlineEnd: 6 }}>{data.rating}</span>
                  <Stars n={data.rating || 5} />
                </div>
              )}
              {!!data.total && <div style={{ fontSize: 12, color: '#777', textAlign: 'center' }} className="md:mb-3">{data.total} ביקורות</div>}
            </div>
            <a href={data.writeUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', border: '1px solid #dadce0', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#1a73e8', textDecoration: 'none', background: '#fff', whiteSpace: 'nowrap' }}>
              כתוב ביקורת
            </a>
          </div>

          {/* כרטיסי ביקורות */}
          {hasReviews && (
            <div className="order-1 md:order-2 w-full md:flex-1"
              style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '4px 2px 12px', minWidth: 0, scrollbarWidth: 'thin' }}>
              {data.reviews.map((rv, i) => {
                const isLong = rv.text.length > 150;
                const open = expanded.has(i);
                return (
                  <div key={i} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', padding: 16, width: 260, flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      {rv.avatar ? (
                        <img src={rv.avatar} alt="" width={36} height={36} loading="lazy" referrerPolicy="no-referrer"
                          style={{ borderRadius: '50%', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1a5c3a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                          {rv.author.charAt(0)}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rv.author}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{rv.when}</div>
                      </div>
                      <span style={{ marginInlineStart: 'auto', flexShrink: 0 }}><GIcon /></span>
                    </div>
                    <div style={{ marginBottom: 6 }}><Stars n={rv.rating} /></div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>
                      {open || !isLong ? rv.text : rv.text.slice(0, 150) + '…'}
                    </div>
                    {isLong && (
                      <button
                        onClick={() => setExpanded(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; })}
                        style={{ background: 'none', border: 'none', color: '#999', fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 6 }}>
                        {open ? 'הצג פחות' : 'קרא עוד'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

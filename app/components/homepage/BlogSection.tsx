'use client';

import Link from 'next/link';

const ARTICLES = [
  {
    href: '/madrich/bechira',
    emoji: '🔍',
    tag: 'מדריך קנייה',
    title: 'כיצד לבחור קלף מזוזה כשר?',
    excerpt: 'כל מה שצריך לדעת על כשרות הקלף, גודל המזוזה לפי הפתח, ורמות ההידור השונות — במדריך מקיף ומעשי.',
    readTime: '4 דקות קריאה',
  },
  {
    href: '/madrich/bedika',
    emoji: '📋',
    tag: 'הלכה למעשה',
    title: 'מתי ואיך לבדוק מזוזות?',
    excerpt: 'חובה לבדוק מזוזות פעמיים בשבע שנים. למד מי מוסמך לבדוק, מה בודקים, ואיך לשמור על כשרות הקלף לאורך זמן.',
    readTime: '3 דקות קריאה',
  },
  {
    href: '/madrich/soferim',
    emoji: '✍️',
    tag: 'על הסופרים',
    title: 'מי הם סופרי סת"מ ואיך הם עובדים?',
    excerpt: 'הסופר כותב כל אות ביד, לפי הלכות מדויקות. גלה את המלאכה העתיקה שמאחורי כל קלף מזוזה ותפילין.',
    readTime: '5 דקות קריאה',
  },
] as const;

export default function BlogSection() {
  return (
    <div style={{
      background: '#f8f4ec',
      padding: 'clamp(36px,5vw,64px) clamp(16px,4vw,40px)',
      direction: 'rtl',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>
              ✦ מדריכים ומאמרים
            </div>
            <h2 style={{ fontSize: 'clamp(20px,2.8vw,30px)', fontWeight: 900, color: '#0c1a35', margin: 0 }}>
              ידע שיעזור לך לבחור נכון
            </h2>
          </div>
          <Link
            href="/madrich"
            style={{ fontSize: 13, fontWeight: 700, color: '#b8972a', textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline')}
            onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none')}
          >
            לכל המדריכים ←
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 'clamp(14px,2vw,24px)',
        }}>
          {ARTICLES.map(article => (
            <Link
              key={article.href}
              href={article.href}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: '1.5px solid #ede8df',
                  padding: 24,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = '#b8972a';
                  el.style.boxShadow = '0 8px 28px rgba(184,151,42,0.12)';
                  el.style.transform = 'translateY(-3px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = '#ede8df';
                  el.style.boxShadow = 'none';
                  el.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'rgba(184,151,42,0.1)',
                    border: '1px solid rgba(184,151,42,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    flexShrink: 0,
                  }}>
                    {article.emoji}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', background: 'rgba(184,151,42,0.1)', borderRadius: 20, padding: '3px 12px' }}>
                    {article.tag}
                  </span>
                </div>

                <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0c1a35', margin: 0, lineHeight: 1.35 }}>
                  {article.title}
                </h3>

                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, margin: 0, flex: 1 }}>
                  {article.excerpt}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>{article.readTime}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#b8972a' }}>קרא עוד ←</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

const REASONS = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'כשרות מאומתת',
    body: 'כל קלף נבדק על ידי מגיה מוסמך לפני המשלוח. אתם מקבלים תעודת כשרות ותמונה של הקלף האמיתי שלכם.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    title: 'ישירות מהסופר',
    body: 'אנחנו מחברים אתכם ישירות עם הסופר שכתב את הקלף. אפשר לשאול שאלות, לבקש התאמות, ולפגוש את האדם מאחורי המלאכה.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    title: 'תמונות אמיתיות',
    body: 'כל קלף מצולם מקרוב לפני המשלוח. מה שאתם רואים באתר — הוא בדיוק מה שאתם מקבלים.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'שירות אישי בוואטסאפ',
    body: 'יש לכם שאלה? שלחו הודעה. הצוות שלנו ענה תוך דקות — בעברית, בלי בוטים, בלי תורים.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: 'משלוח מהיר לכל הארץ',
    body: 'משלוח עד הבית תוך 3–5 ימי עסקים לכל רחבי הארץ, עם אפשרות לאיסוף עצמי.',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8972a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    ),
    title: 'אחריות והחזר כספי',
    body: 'לא מרוצים? אנחנו מחזירים את הכסף. מדיניות החזרה ברורה ללא שאלות — כי האמון שלכם חשוב לנו.',
  },
] as const;

export default function WhyChooseUsSection() {
  return (
    <div style={{
      background: '#fff',
      padding: 'clamp(40px,6vw,72px) clamp(16px,4vw,40px)',
      direction: 'rtl',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', letterSpacing: '0.1em', marginBottom: 12 }}>
            ✦ למה לבחור בנו
          </div>
          <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 900, color: '#0c1a35', margin: '0 0 12px' }}>
            Your Sofer — שקיפות מלאה, איכות ללא פשרות
          </h2>
          <p style={{ fontSize: 'clamp(13px,1.5vw,16px)', color: '#777', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>
            אנחנו לא רק מוכרים סת&quot;מ — אנחנו בונים אמון. כל מוצר מתועד, מאומת ומועבר אליכם בשקיפות מלאה.
          </p>
        </div>

        <style>{`
          .why-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: clamp(16px, 2vw, 28px);
          }
          @media (min-width: 768px) {
            .why-grid { grid-template-columns: repeat(3, 1fr); }
          }
        `}</style>

        <div className="why-grid">
          {REASONS.map(reason => (
            <div
              key={reason.title}
              style={{
                padding: 'clamp(18px,2.5vw,28px)',
                borderRadius: 16,
                border: '1.5px solid #ede8df',
                background: '#fafaf8',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = '#b8972a';
                el.style.background = '#fffbf0';
                el.style.boxShadow = '0 6px 24px rgba(184,151,42,0.1)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = '#ede8df';
                el.style.background = '#fafaf8';
                el.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'rgba(184,151,42,0.1)',
                border: '1px solid rgba(184,151,42,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {reason.icon}
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0c1a35', margin: '0 0 8px', lineHeight: 1.3 }}>
                  {reason.title}
                </h3>
                <p style={{ fontSize: 13, color: '#666', lineHeight: 1.65, margin: 0 }}>
                  {reason.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

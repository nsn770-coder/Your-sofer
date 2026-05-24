'use client';

const GOLD = '#C9A227';
const NAVY = '#1E3A8A';
const GOLD_LIGHT = 'rgba(201,162,39,0.12)';

function InitialsAvatar({ initials, size = 88 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, #223366, ${NAVY})`,
      border: `2px solid ${GOLD}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: `0 0 0 3px rgba(201,162,39,0.15)`,
    }}>
      <span style={{ color: GOLD, fontWeight: 900, fontSize: size * 0.33, letterSpacing: -1 }}>{initials}</span>
    </div>
  );
}

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#EEF3FF',
      borderRadius: 0, padding: '5px 14px',
      fontSize: 12, fontWeight: 600, color: '#2446A6',
      letterSpacing: 0.4,
    }}>
      {children}
    </span>
  );
}

function ProfileCard({
  initials, name, title, description, badge, isMobile, imageUrl,
}: {
  initials: string; name: string; title: string;
  description: string; badge: string; isMobile: boolean; imageUrl?: string;
}) {
  const avatarSize = isMobile ? 76 : 88;
  return (
    <div style={{
      flex: 1,
      background: '#FFFFFF',
      borderRadius: 0,
      padding: isMobile ? '32px 24px' : '40px 32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, textAlign: 'center',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          style={{
            width: avatarSize, height: avatarSize, borderRadius: '50%',
            objectFit: 'cover', flexShrink: 0,
            border: `2px solid ${GOLD}`,
          }}
        />
      ) : (
        <InitialsAvatar initials={initials} size={avatarSize} />
      )}
      <div>
        <div style={{ fontSize: isMobile ? 16 : 17, fontWeight: 700, color: '#1F2937', marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>{title}</div>
      </div>
      <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, maxWidth: 260, margin: 0 }}>
        {description}
      </p>
      <BadgePill>{badge}</BadgePill>
    </div>
  );
}

export default function RabbinicalSupervision({ isMobile }: { isMobile: boolean }) {
  return (
    <section
      dir="rtl"
      style={{
        background: '#FAF8F3',
        padding: isMobile ? '72px 20px' : '112px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>

        {/* Section heading */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 44 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: GOLD_LIGHT,
            border: `1px solid rgba(201,162,39,0.35)`,
            borderRadius: 0, padding: '6px 16px',
            fontSize: 12, fontWeight: 600, color: GOLD,
            marginBottom: 16, letterSpacing: 0.6,
          }}>
            <span>✡</span> פיקוח רבני
          </div>

          <h2 style={{
            fontSize: isMobile ? 26 : 32,
            fontWeight: 300, color: '#1F2937',
            lineHeight: 1.4, margin: '0 0 14px',
            letterSpacing: '-0.01em',
          }}>
            כל מוצר סת״מ באתר עובר בדיקה ואישור רבני
          </h2>
          <p style={{
            fontSize: 16,
            color: '#6B7280',
            margin: 0, fontWeight: 400,
          }}>
            אנו מחויבים לסטנדרט הכשרות הגבוה ביותר
          </p>
        </div>

        {/* Profile cards */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
        }}>
          <ProfileCard
            initials="שב"
            name="הרב שמחה בונים ברג'יקובסקי"
            title="רב מגיה מוסמך"
            description="עם נסיון של 12 שנה בתחום ההגהה קיבל הסמכה מגדולי הרבנים בארץ וממכון יד רפאל המוכר"
            badge="פיקוח רבני"
            isMobile={isMobile}
            imageUrl="https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_200/v1778136770/%D7%A6%D7%99%D7%9C%D7%95%D7%9D_%D7%9E%D7%A1%D7%9A_2026-05-07_095231_wojjah.png"
          />
          <ProfileCard
            initials="נ״ב"
            name="הרב ניסים בוארון"
            title='סופר סת"מ מוסמך'
            description='סופר סת״מ מומחה מעל 15 שנה ויועץ בתחום. הרב ניסים משמש כשליח חב״ד לנוער בדימונה.'
            badge='סופר מוסמך'
            isMobile={isMobile}
            imageUrl="https://res.cloudinary.com/dyxzq3ucy/image/upload/f_auto,q_auto,w_200/v1777926225/FB_IMG_1777926117765_rbw8ny.jpg"
          />
        </div>

        {/* Kashrut certificate link */}
        <div style={{ textAlign: 'center', marginTop: isMobile ? 24 : 32 }}>
          <a
            href="/kashrut"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'transparent',
              color: GOLD,
              border: `2px solid ${GOLD}`,
              borderRadius: 0, padding: isMobile ? '11px 28px' : '13px 36px',
              fontSize: isMobile ? 14 : 15, fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: 0.3,
              transition: 'background 0.25s, color 0.25s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = GOLD; (e.currentTarget as HTMLAnchorElement).style.color = NAVY; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = GOLD; }}
          >
            📜 צפה בתעודת הכשרות
          </a>
        </div>

        {/* Bottom trust strip */}
        <div style={{
          marginTop: isMobile ? 28 : 36,
          display: 'flex', flexWrap: 'wrap', gap: 10,
          justifyContent: 'center',
        }}>
          {[
            'בדיקת מחשב לכל קלף',
            'פיקוח מגיה על כל יחידה',
            'תעודת כשרות מצורפת',
            'עמידה בתקן ההלכתי',
          ].map(item => (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: '#F8F6F1',
              borderRadius: 0, padding: '7px 16px',
              fontSize: 12, color: '#1E3A8A', fontWeight: 600,
            }}>
              <span style={{ color: GOLD, fontSize: 13 }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

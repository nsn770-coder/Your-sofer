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
      borderRadius: 20, padding: '4px 12px',
      fontSize: 12, fontWeight: 700, color: '#2446A6',
      letterSpacing: 0.3,
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
      border: '1px solid #E7E2D8',
      borderRight: `3px solid ${GOLD}`,
      borderRadius: 16,
      padding: isMobile ? '24px 20px' : '28px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 14, textAlign: 'center',
      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
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
        padding: isMobile ? '56px 20px' : '88px 48px',
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
            border: `1px solid rgba(201,162,39,0.4)`,
            borderRadius: 20, padding: '6px 16px',
            fontSize: 12, fontWeight: 700, color: GOLD,
            marginBottom: 16, letterSpacing: 0.5,
          }}>
            <span>✡</span> פיקוח רבני
          </div>

          <h2 style={{
            fontSize: isMobile ? 28 : 32,
            fontWeight: 800, color: '#1F2937',
            lineHeight: 1.35, margin: '0 0 12px',
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
            description='סופר מוסמך עם שנות ניסיון בכתיבת סת"מ ברמה הגבוהה ביותר'
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
              background: GOLD,
              color: NAVY,
              borderRadius: 10, padding: isMobile ? '11px 24px' : '13px 32px',
              fontSize: isMobile ? 14 : 15, fontWeight: 900,
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(197,160,40,0.35)',
              letterSpacing: 0.2,
            }}
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
              background: '#f5f5f5',
              border: '1px solid #e0e0e0',
              borderRadius: 20, padding: '7px 14px',
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

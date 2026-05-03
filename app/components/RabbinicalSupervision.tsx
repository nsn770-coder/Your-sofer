'use client';

const GOLD = '#C5A028';
const NAVY = '#111d3a';
const NAVY_CARD = '#18274a';
const GOLD_LIGHT = 'rgba(197,160,40,0.15)';

function InitialsAvatar({ initials, size = 88 }: { initials: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, #223366, ${NAVY})`,
      border: `3px solid ${GOLD}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: `0 0 0 4px rgba(197,160,40,0.18), 0 4px 20px rgba(0,0,0,0.35)`,
    }}>
      <span style={{ color: GOLD, fontWeight: 900, fontSize: size * 0.33, letterSpacing: -1 }}>{initials}</span>
    </div>
  );
}

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: GOLD_LIGHT,
      border: `1px solid rgba(197,160,40,0.5)`,
      borderRadius: 20, padding: '4px 12px',
      fontSize: 11, fontWeight: 700, color: GOLD,
      letterSpacing: 0.3,
    }}>
      <span style={{ color: GOLD, fontSize: 12 }}>✓</span>
      {children}
    </span>
  );
}

function ProfileCard({
  initials, name, title, description, badge, isMobile,
}: {
  initials: string; name: string; title: string;
  description: string; badge: string; isMobile: boolean;
}) {
  return (
    <div style={{
      flex: 1,
      background: NAVY_CARD,
      border: `1px solid rgba(197,160,40,0.2)`,
      borderRadius: 16,
      padding: isMobile ? '24px 20px' : '28px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 14, textAlign: 'center',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    }}>
      <InitialsAvatar initials={initials} size={isMobile ? 76 : 88} />
      <div>
        <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, color: '#fff', marginBottom: 3 }}>{name}</div>
        <div style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>{title}</div>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: 260, margin: 0 }}>
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
        background: `linear-gradient(160deg, ${NAVY} 0%, #0e1a36 60%, #0a1428 100%)`,
        padding: isMobile ? '44px 16px' : '60px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle decorative glow */}
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 300,
        background: 'radial-gradient(ellipse, rgba(197,160,40,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative' }}>

        {/* Section heading */}
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 44 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: GOLD_LIGHT,
            border: `1px solid rgba(197,160,40,0.4)`,
            borderRadius: 20, padding: '6px 16px',
            fontSize: 12, fontWeight: 700, color: GOLD,
            marginBottom: 16, letterSpacing: 0.5,
          }}>
            <span>✡</span> פיקוח רבני
          </div>

          <h2 style={{
            fontSize: isMobile ? 22 : 28,
            fontWeight: 900, color: '#fff',
            lineHeight: 1.35, margin: '0 0 12px',
            textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>
            כל מוצר סת״מ באתר עובר בדיקה ואישור רבני
          </h2>
          <p style={{
            fontSize: isMobile ? 14 : 15,
            color: 'rgba(255,255,255,0.65)',
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
            initials="ב״ג"
            name="הרב בנימין גליס"
            title="רב מגיה מוסמך"
            description="מגיה ומאשר את כל קלפי המזוזות, התפילין והמגילות הנמכרים באתר"
            badge="פיקוח רבני"
            isMobile={isMobile}
          />
          <ProfileCard
            initials="נ״ב"
            name="הרב ניסים בואהרון"
            title='סופר סת"מ מוסמך'
            description='סופר מוסמך עם שנות ניסיון בכתיבת סת"מ ברמה הגבוהה ביותר'
            badge='סופר מוסמך'
            isMobile={isMobile}
          />
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
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20, padding: '7px 14px',
              fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600,
            }}>
              <span style={{ color: GOLD, fontSize: 13 }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

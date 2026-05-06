'use client';
import { useRouter } from 'next/navigation';

const TEAM = [
  {
    initials: 'נב',
    name: 'הרב ניסים בוארון',
    role: 'מנהל ומייסד | סופר סת"מ מומחה',
    desc: 'סופר סת"מ מוסמך עם שנות ניסיון בכתיבת קלפים ברמה הגבוהה ביותר. מוביל את החזון של Your Sofer להנגיש סת"מ איכותי לכל יהודי.',
    imageUrl: 'https://res.cloudinary.com/dyxzq3ucy/image/upload/v1777926225/FB_IMG_1777926117765_rbw8ny.jpg',
  },
  {
    initials: 'שב',
    name: 'הרב שמחה בונים ברג\'יקובסקי',
    role: 'רב מגיה ובודק מוסמך',
    desc: 'עם נסיון של 12 שנה בתחום ההגהה קיבל הסמכה מגדולי הרבנים בארץ וממכון יד רפאל המוכר',
  },
  {
    initials: 'ימ',
    name: 'יוסף חיים מנחם',
    role: 'שירות לקוחות ולוגיסטיקה',
    desc: 'אחראי על חווית הלקוח ותהליך המשלוח. זמין לכל שאלה ובקשה לפני ואחרי הרכישה.',
  },
];

const VALUES = [
  { icon: '🔍', title: 'שקיפות מלאה', desc: 'אתם יודעים מי כתב את המזוזה שלכם' },
  { icon: '✡️', title: 'כשרות ללא פשרות', desc: 'כל מוצר כשר לכתחילה 100%' },
  { icon: '💛', title: 'מטרה חברתית', desc: 'כל רכישה תורמת לנוער בדימונה' },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#f7f4ef', minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #1a2a4a 100%)', padding: '52px 20px 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✡️</div>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 10px' }}>מי אנחנו</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: 0 }}>
          החזון, האנשים והערכים שמאחורי Your Sofer
        </p>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 16px 60px' }}>

        {/* Our story */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d0', padding: '32px', marginBottom: 24 }}>
          <h2 style={{ color: '#0c1a35', fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>הסיפור שלנו</h2>
          <p style={{ color: '#444', fontSize: 15, lineHeight: 1.85, margin: 0 }}>
            Your Sofer נוסדה מתוך חזון אחד — להנגיש סת"מ ויודאיקה איכותית לכל יהודי, בשקיפות מלאה ובמחירים הוגנים.
            <br /><br />
            כל הכנסות החנות מועברות לעמותת סודות התורה — עמותה המפעילה פעילות חינוכית וקהילתית לנוער בדימונה.
          </p>
        </div>

        {/* Charity highlight */}
        <div style={{ background: 'rgba(184,151,42,0.08)', border: '2px solid #b8972a', padding: '24px 28px', marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💛</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0c1a35', marginBottom: 6 }}>
            100% מהרווחים עוברים לעמותת סודות התורה
          </div>
          <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
            עמותה רשומה המפעילה פעילות חינוכית לנוער בדימונה
          </div>
        </div>

        {/* Team */}
        <h2 style={{ color: '#0c1a35', fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>הצוות שלנו</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 12 }}>
          {TEAM.map(member => (
            <div key={member.name} style={{ background: '#fff', border: '1px solid #e8e0d0', padding: '24px 20px', textAlign: 'center' }}>
              {member.imageUrl ? (
                <img
                  src={member.imageUrl}
                  alt={member.name}
                  style={{
                    width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
                    margin: '0 auto 16px', display: 'block',
                    border: '3px solid #b8972a',
                  }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', background: '#b8972a', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 900, margin: '0 auto 16px',
                }}>
                  {member.initials}
                </div>
              )}
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0c1a35', marginBottom: 4 }}>{member.name}</div>
              <div style={{ fontSize: 12, color: '#b8972a', fontWeight: 600, marginBottom: 10 }}>{member.role}</div>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.65, margin: 0 }}>{member.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 36 }}>תמונות הצוות יעודכנו בקרוב</p>

        {/* Values */}
        <h2 style={{ color: '#0c1a35', fontSize: 20, fontWeight: 800, margin: '0 0 20px' }}>הערכים שלנו</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
          {VALUES.map(v => (
            <div key={v.title} style={{ background: '#fff', border: '1px solid #e8e0d0', padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{v.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0c1a35', marginBottom: 6 }}>{v.title}</div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{v.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #1a2a4a 100%)', padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, margin: '0 0 20px', fontWeight: 600 }}>
            רוצה לדעת עוד? צור איתנו קשר
          </p>
          <button
            onClick={() => router.push('/contact')}
            style={{ background: '#b8972a', color: '#fff', border: 'none', padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', borderRadius: 0, fontFamily: 'inherit' }}
          >
            לדף צור קשר ←
          </button>
        </div>

      </div>
    </div>
  );
}

'use client';
import { useRouter } from 'next/navigation';

// ══ צבעים ══
export const C = {
  navy: '#0c1a35',
  navyLight: '#162444',
  gold: '#b8972a',
  goldLight: '#d4aa40',
  bg: '#f3f4f4',
  white: '#fff',
  text: '#1a1a2e',
  muted: '#666',
  border: '#e0e0e0',
};

// ══ ציטוט מודגש ══
export function QuoteBlock({ text, author }: { text: string; author?: string }) {
  return (
    <div style={{
      borderRight: `4px solid ${C.gold}`,
      background: '#fdf8ee',
      padding: '20px 24px',
      borderRadius: '0 8px 8px 0',
      margin: '28px 0',
      position: 'relative',
    }}>
      <div style={{ fontSize: 40, color: C.gold, lineHeight: 1, marginBottom: 8, fontFamily: 'Georgia, serif' }}>"</div>
      <p style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0, lineHeight: 1.6 }}>{text}</p>
      {author && <p style={{ fontSize: 13, color: C.muted, marginTop: 10, marginBottom: 0 }}>— {author}</p>}
    </div>
  );
}

// ══ כפתור CTA ══
export function CTAButton({ label, href, variant = 'primary' }: { label: string; href: string; variant?: 'primary' | 'secondary' }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(href)}
      style={{
        background: variant === 'primary' ? C.gold : 'transparent',
        color: variant === 'primary' ? C.navy : C.navy,
        border: `2px solid ${C.gold}`,
        borderRadius: 8,
        padding: '12px 24px',
        fontSize: 15,
        fontWeight: 800,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: "'Heebo', Arial, sans-serif",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = variant === 'primary' ? C.goldLight : C.gold;
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = variant === 'primary' ? C.gold : 'transparent';
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }}
    >
      {label}
    </button>
  );
}

// ══ רצועת CTA תחתונה ══
export function CTAStrip({ title, buttons }: { title: string; buttons: { label: string; href: string; variant?: 'primary' | 'secondary' }[] }) {
  return (
    <div style={{
      background: C.navy,
      borderRadius: 12,
      padding: '32px 24px',
      margin: '48px 0 0',
      textAlign: 'center',
    }}>
      <p style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{title}</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {buttons.map(b => <CTAButton key={b.label} {...b} />)}
      </div>
    </div>
  );
}

// ══ כרטיס מאמר קשור ══
export function RelatedCard({ title, desc, href, emoji }: { title: string; desc: string; href: string; emoji: string }) {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push(href)}
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        flex: '1 1 220px',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
        (e.currentTarget as HTMLDivElement).style.borderColor = C.gold;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.navy, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
      <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginTop: 10 }}>קרא עוד ←</div>
    </div>
  );
}

// ══ כותרת דף ══
export function PageHero({ title, subtitle, badge }: { title: string; subtitle: string; badge?: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.navy} 0%, #1a3060 100%)`,
      padding: '56px 24px 48px',
      textAlign: 'center',
      color: '#fff',
    }}>
      {badge && (
        <div style={{
          display: 'inline-block',
          background: C.gold,
          color: C.navy,
          fontSize: 12,
          fontWeight: 800,
          padding: '4px 14px',
          borderRadius: 20,
          marginBottom: 16,
        }}>{badge}</div>
      )}
      <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.3 }}>{title}</h1>
      <p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: 'rgba(255,255,255,0.8)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>{subtitle}</p>
    </div>
  );
}

// ══ עמודת Layout לדף מאמר ══
export function ArticleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      direction: 'rtl',
      fontFamily: "'Heebo', Arial, sans-serif",
    }}>
      {/* Navbar stub */}
      <nav style={{ background: C.navy, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ color: C.gold, fontWeight: 900, fontSize: 20, textDecoration: 'none' }}>✡ Your Sofer</a>
        <a href="/madrich" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, textDecoration: 'none' }}>← מדריך למזוזות</a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px 60px' }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{ background: C.navy, padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
        © 2025 Your Sofer · your-sofer.com
      </div>
    </div>
  );
}

// ══ FAQ Item ══
export function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: '20px 0' }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color: C.gold, flexShrink: 0 }}>?</span>
        {q}
      </div>
      <div style={{ fontSize: 15, color: '#444', lineHeight: 1.7, paddingRight: 24 }}>{a}</div>
    </div>
  );
}

// ══ Step ══
export function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start' }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: C.navy, color: C.gold,
        fontWeight: 900, fontSize: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{num}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 17, color: C.navy, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 15, color: '#444', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

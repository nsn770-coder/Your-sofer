'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/account',           label: 'סקירה',      icon: '🏠' },
  { href: '/account/orders',    label: 'הזמנות',      icon: '📦' },
  { href: '/account/profile',   label: 'הפרטים שלי', icon: '👤' },
  { href: '/account/addresses', label: 'כתובות',      icon: '📍' },
  { href: '/account/loyalty',   label: 'נקודות',      icon: '⭐' },
  { href: '/account/club-deals',label: 'מבצעי מועדון',icon: '🏷️' },
  { href: '/account/messages',  label: 'הודעות',      icon: '🔔', soon: true },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/account/login') {
      router.replace(`/account/login?next=${encodeURIComponent(pathname || '/account')}`);
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="ys-spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#F8F6F1', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ys-spinner { width:32px; height:32px; border:3px solid #E7E2D8; border-top-color:var(--ys-accent); border-radius:50%; animation:spin 0.8s linear infinite; }
        .ys-account-sidebar { display:none; }
        @media(min-width:768px){ .ys-account-sidebar { display:block; width:200px; flex-shrink:0; } }
        .ys-account-nav-link { display:flex; align-items:center; gap:8px; padding:11px 16px; font-size:13px; text-decoration:none; transition:all 0.12s; border-right:3px solid transparent; }
        .ys-account-nav-link:hover { background:#F8F6F1; }
        .ys-account-nav-link.active { font-weight:700; color:#1a1a1a !important; background:#F8F6F1; border-right-color:var(--ys-accent); }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* סרגל ניווט — נגלה רק ב-tablet/desktop */}
        <aside className="ys-account-sidebar">
          <div style={{ background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '18px 16px', borderBottom: '1px solid #F0EDE8' }}>
              <div style={{ fontSize: 11, color: 'var(--ys-accent)', fontWeight: 700, letterSpacing: 1 }}>החשבון שלי</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ys-text)', marginTop: 2 }}>
                {user.firstName || user.displayName?.split(' ')[0] || 'לקוח'}
              </div>
            </div>
            <nav>
              {NAV_LINKS.map(link => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.soon ? '#' : link.href}
                    className={`ys-account-nav-link${active ? ' active' : ''}`}
                    style={{ color: link.soon ? '#bbb' : active ? '#1a1a1a' : '#555', cursor: link.soon ? 'default' : 'pointer' }}
                    onClick={e => link.soon && e.preventDefault()}
                  >
                    <span>{link.icon}</span>
                    {link.label}
                    {link.soon && (
                      <span style={{ marginRight: 'auto', fontSize: 10, color: 'var(--ys-accent)', border: '1px solid var(--ys-accent)', padding: '1px 4px' }}>בקרוב</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* תוכן עמוד */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

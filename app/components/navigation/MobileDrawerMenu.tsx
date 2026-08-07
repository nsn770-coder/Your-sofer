"use client";

import { useEffect, useState, useCallback } from "react";
import { X, ChevronLeft, ArrowRight } from "lucide-react";

export interface NavSubItem { label: string; cat: string; filter?: string; }
export interface NavColumn { title: string; items: NavSubItem[]; }
export interface NavMenuItem { id: string; label: string; cat: string; columns: NavColumn[]; }
export interface SimpleNavItem { label: string; action: string; }

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  menuData: NavMenuItem[];
  simpleNav: SimpleNavItem[];
  onSelect: (cat: string, filter?: string) => void;
  onAction: (action: string) => void;
  user: { displayName?: string | null; photoURL?: string | null; role?: string; firstName?: string } | null;
  signInWithGoogle: () => void;
  logout: () => void;
}

/**
 * מצב הניווט — מחסנית של רמות.
 * [] = רמת השורש (רשימת המחלקות)
 * [deptId] = רמה 2 (קבוצות בתוך מחלקה)
 * [deptId, columnIndex] = רמה 3 (פריטי הקבוצה)
 */
type Path = { deptId?: string; colIndex?: number };

// ── שורה בודדת ברשימה ────────────────────────────────────────────────────────
function Row({
  label, onClick, hasChildren = false, tone = 'default',
}: {
  label: string;
  onClick: () => void;
  hasChildren?: boolean;
  tone?: 'default' | 'muted' | 'sale';
}) {
  const color = tone === 'sale' ? '#c0392b' : tone === 'muted' ? '#6B6B72' : 'var(--ys-ink)';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '15px 20px',
        fontSize: tone === 'muted' ? 15 : 16,
        fontWeight: tone === 'default' ? 600 : tone === 'sale' ? 700 : 400,
        color,
        background: tone === 'sale' ? '#FFF5F5' : 'none',
        border: 'none', borderBottom: '1px solid #F0EDE8',
        cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
      }}
    >
      <span>{label}</span>
      {/* ב-RTL ההתקדמות פנימה היא שמאלה — ולכן החץ מצביע שמאלה */}
      {hasChildren && <ChevronLeft size={18} style={{ color: '#b0a898', flexShrink: 0 }} />}
    </button>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
export default function MobileDrawerMenu({
  isOpen,
  onClose,
  menuData,
  simpleNav,
  onSelect,
  onAction,
  user,
  signInWithGoogle,
  logout,
}: MobileDrawerMenuProps) {
  const [path, setPath] = useState<Path>({});
  // כיוון האנימציה — 'in' בכניסה לעומק, 'out' בחזרה
  const [dir, setDir] = useState<'in' | 'out'>('in');

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // איפוס לרמת השורש בכל פתיחה — אחרת התפריט נפתח איפה שהמשתמש עזב
  useEffect(() => {
    if (isOpen) { setPath({}); setDir('in'); }
  }, [isOpen]);

  const goDeeper = useCallback((next: Path) => { setDir('in'); setPath(next); }, []);
  const goBack   = useCallback(() => {
    setDir('out');
    setPath(p => (p.colIndex !== undefined ? { deptId: p.deptId } : {}));
  }, []);

  // סגירה + ניווט
  const pick = (cat: string, filter?: string) => { onSelect(cat, filter); };
  const act  = (action: string) => { onAction(action); };

  const dept = path.deptId ? menuData.find(m => m.id === path.deptId) : undefined;
  const col  = dept && path.colIndex !== undefined ? dept.columns[path.colIndex] : undefined;

  const atRoot = !dept;
  const title  = col ? col.title : dept ? dept.label : 'קנייה לפי קטגוריה';
  // מפתח ייחודי לרמה — מאלץ React לרנדר מחדש ולהפעיל את האנימציה
  const levelKey = `${path.deptId ?? ''}-${path.colIndex ?? ''}`;

  return (
    <>
      <style>{`
        @keyframes ysLevelIn  { from { opacity:0; transform:translateX(28px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes ysLevelOut { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        .ys-level { animation: 0.22s cubic-bezier(0.32,0.72,0,1) both; }
        .ys-level-in  { animation-name: ysLevelIn;  }
        .ys-level-out { animation-name: ysLevelOut; }
        @media (prefers-reduced-motion: reduce) { .ys-level { animation: none; } }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.35)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          zIndex: 310,
          width: '85vw', maxWidth: 360,
          background: '#fff',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        dir="rtl"
        aria-hidden={!isOpen}
      >
        {/* ── Header — חץ חזרה מופיע רק בתוך רמות פנימיות ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '16px 20px', borderBottom: '1px solid #F0EDE8',
          flexShrink: 0,
        }}>
          {!atRoot && (
            <button
              onClick={goBack}
              aria-label="חזרה"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ys-ink)', display: 'flex', flexShrink: 0 }}
            >
              {/* ב-RTL החזרה היא ימינה */}
              <ArrowRight size={20} />
            </button>
          )}
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ys-ink)', flex: 1, minWidth: 0 }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="סגור תפריט"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#888', display: 'flex', flexShrink: 0 }}
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div key={levelKey} className={`ys-level ${dir === 'in' ? 'ys-level-in' : 'ys-level-out'}`}>

            {/* ══ רמה 1 — מחלקות ══ */}
            {atRoot && (
              <>
                <Row label="🏷️ מבצעים" tone="sale" onClick={() => act('sale')} />

                {menuData.map(item => {
                  // מחלקה עם פריט בודד ויחיד — קיצור ישיר, בלי רמה מיותרת
                  const flat = item.columns.length === 1 && item.columns[0].items.length <= 1;
                  return (
                    <Row
                      key={item.id}
                      label={item.label}
                      hasChildren={!flat}
                      onClick={() => (flat ? pick(item.cat) : goDeeper({ deptId: item.id }))}
                    />
                  );
                })}

                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EDE8' }}>
                  <a
                    href="/soferim"
                    onClick={onClose}
                    style={{
                      display: 'block', width: '100%',
                      background: 'var(--ys-page)', color: 'var(--ys-plum)',
                      border: '1px solid var(--ys-plum)', padding: '12px 16px',
                      fontWeight: 700, fontSize: 14, textAlign: 'right',
                      textDecoration: 'none', boxSizing: 'border-box',
                    }}
                  >
                    הכירו את הסופרים שלנו ←
                  </a>
                </div>

                {simpleNav.map(nav => (
                  <Row key={nav.action} label={nav.label} tone="muted" onClick={() => act(nav.action)} />
                ))}
              </>
            )}

            {/* ══ רמה 2 — קבוצות בתוך מחלקה ══ */}
            {dept && path.colIndex === undefined && (
              <>
                {dept.columns.map((c, ci) =>
                  // קבוצה יחידה — פורסים את הפריטים כאן במקום רמה נוספת מיותרת
                  dept.columns.length === 1 ? (
                    c.items.map((sub, si) => (
                      <Row key={si} label={sub.label} onClick={() => pick(sub.cat, sub.filter)} />
                    ))
                  ) : (
                    <Row key={ci} label={c.title} hasChildren onClick={() => goDeeper({ deptId: dept.id, colIndex: ci })} />
                  )
                )}
                <SeeAll label={dept.label} onClick={() => pick(dept.cat)} />
              </>
            )}

            {/* ══ רמה 3 — פריטי הקבוצה ══ */}
            {dept && col && (
              <>
                {col.items.map((sub, si) => (
                  <Row key={si} label={sub.label} onClick={() => pick(sub.cat, sub.filter)} />
                ))}
                <SeeAll label={dept.label} onClick={() => pick(dept.cat)} />
              </>
            )}
          </div>
        </div>

        {/* ── Footer — auth ── */}
        <div style={{ borderTop: '1px solid #F0EDE8', background: '#fafaf9', flexShrink: 0 }}>
          {user ? (
            <div dir="rtl">
              <div style={{ padding: '14px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--ys-ink)', fontWeight: 700 }}>
                  שלום, {user.firstName || user.displayName?.split(' ')[0] || 'אורח'} 👋
                </span>
                <button onClick={logout} style={{ border: '1px solid #ddd', color: '#888', background: '#fff', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                  יציאה
                </button>
              </div>
              <div style={{ display: 'flex', gap: 0, padding: '4px 20px 16px', flexWrap: 'wrap' }}>
                {[
                  { label: '📦 הזמנות', href: '/account/orders' },
                  { label: '👤 הפרטים שלי', href: '/account/profile' },
                  { label: '📍 כתובות', href: '/account/addresses' },
                  { label: '⭐ הנקודות שלי', href: '/account/loyalty' },
                  { label: '🏷️ מבצעי מועדון', href: '/account/club-deals' },
                ].map(link => (
                  <a key={link.href} href={link.href} style={{ fontSize: 12, color: '#555', textDecoration: 'none', padding: '4px 8px 4px 0', marginLeft: 4 }}>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: '18px 20px' }}>
              <button
                onClick={signInWithGoogle}
                style={{ width: '100%', background: 'var(--ys-plum)', border: 'none', color: 'var(--ys-on-dark)', borderRadius: 'var(--ys-radius-pill)', padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
                התחבר עם Google
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── כפתור "הצג הכל" — סוגר את המסלול ומוביל לעמוד הקטגוריה ─────────────────
function SeeAll({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <button
        onClick={onClick}
        style={{
          width: '100%', background: 'var(--ys-plum)', color: 'var(--ys-on-dark)',
          borderRadius: 'var(--ys-radius-pill)',
          border: 'none', padding: '13px 16px',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        הצג את כל {label}
      </button>
    </div>
  );
}

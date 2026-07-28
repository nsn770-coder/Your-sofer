"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";

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

// ── Accordion row ─────────────────────────────────────────────────────────────
// Label click → navigates to category. Chevron click → toggles sub-items.
function MobileAccordion({ item, onSelect }: { item: NavMenuItem; onSelect: (cat: string, filter?: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid #F0EDE8' }} dir="rtl">

      {/* ── Main row ── */}
      <div style={{ display: 'flex', alignItems: 'center', direction: 'rtl' }}>
        {/* Chevron — toggles sub-items only (first in RTL = right side) */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'סגור' : 'פתח תת-קטגוריות'}
          style={{
            padding: '16px 18px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ChevronDown
            size={18}
            style={{
              transition: 'transform 0.22s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Label — navigates to category page */}
        <button
          onClick={() => onSelect(item.cat)}
          style={{
            flex: 1,
            textAlign: 'right',
            padding: '16px 20px',
            fontSize: 16,
            fontWeight: 600,
            color: '#1a1a1a',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {item.label}
        </button>
      </div>

      {/* ── Sub-items — same visual style as main rows ── */}
      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.25s ease',
      }}>
        <div style={{ overflow: 'hidden' }}>
          {item.columns.map((col, ci) => (
            <div key={ci}>
              {/* Column title — only when multiple columns */}
              {item.columns.length > 1 && (
                <p style={{
                  padding: '8px 28px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#b0a898',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  borderBottom: '1px solid #F0EDE8',
                  margin: 0,
                }}>
                  {col.title}
                </p>
              )}
              {col.items.map((sub, si) => (
                <button
                  key={si}
                  onClick={() => onSelect(sub.cat, sub.filter)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    width: '100%',
                    padding: '13px 32px',
                    fontSize: 15,
                    color: '#444',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid #F0EDE8',
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontFamily: 'inherit',
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
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
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #F0EDE8' }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>תפריט</span>
          <button
            onClick={onClose}
            aria-label="סגור תפריט"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#888', display: 'flex' }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── Sale row ── */}
          <button
            onClick={() => onAction('sale')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', padding: '16px 20px', fontSize: 16, fontWeight: 700, color: '#c0392b', background: '#FFF5F5', border: 'none', borderBottom: '1px solid #F0EDE8', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit' }}
          >
            🏷️ מבצעים
          </button>

          {/* ── Catalog accordion ── */}
          {menuData.map(item => (
            <MobileAccordion key={item.id} item={item} onSelect={onSelect} />
          ))}

          {/* Soferim CTA */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EDE8' }}>
            <a
              href="/soferim"
              onClick={onClose}
              style={{
                display: 'block',
                width: '100%',
                background: '#F5F8FF',
                color: '#1a1a1a',
                border: '1px solid #C5D5F0',
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: 14,
                textAlign: 'right',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              הכירו את הסופרים שלנו ←
            </a>
          </div>

          {/* Simple nav links */}
          <div style={{ borderTop: '1px solid #F0EDE8' }}>
            {simpleNav.map(nav => (
              <button
                key={nav.action}
                onClick={() => onAction(nav.action)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '15px 20px',
                  textAlign: 'right',
                  fontSize: 16,
                  color: '#555',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #F0EDE8',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {nav.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer — auth */}
        <div style={{ borderTop: '1px solid #F0EDE8', background: '#fafaf9' }}>
          {user ? (
            <div dir="rtl">
              {/* שלום + קישורי חשבון */}
              <div style={{ padding: '14px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 700 }}>
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
                style={{ width: '100%', background: '#1a1a1a', border: 'none', color: '#fff', padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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

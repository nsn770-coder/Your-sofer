'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AccessibilityWidget — תפריט נגישות עצמאי (ללא שירות חיצוני), ת"י 5568.
// כפתור צף + פאנל: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, עצירת
// אנימציות, פונט קריא, איפוס, וקישור להצהרת הנגישות.
// ההעדפות נשמרות ב-localStorage ומוחלות כ-class על <html>.
// הפאנל נגיש בעצמו: פוקוס נלכד, Esc סוגר, aria מלא.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'ys-a11y-prefs';

interface Prefs {
  textStep: 0 | 1 | 2;
  contrast: boolean;
  links: boolean;
  noMotion: boolean;
  readable: boolean;
}

const DEFAULT_PREFS: Prefs = { textStep: 0, contrast: false, links: false, noMotion: false, readable: false };

function applyPrefs(p: Prefs) {
  const html = document.documentElement;
  html.classList.toggle('a11y-text-1', p.textStep === 1);
  html.classList.toggle('a11y-text-2', p.textStep === 2);
  html.classList.toggle('a11y-contrast', p.contrast);
  html.classList.toggle('a11y-links', p.links);
  html.classList.toggle('a11y-no-motion', p.noMotion);
  html.classList.toggle('a11y-readable', p.readable);
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Load saved prefs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = { ...DEFAULT_PREFS, ...JSON.parse(saved) } as Prefs;
        setPrefs(p);
        applyPrefs(p);
      }
    } catch { /* localStorage unavailable — non-fatal */ }
  }, []);

  const update = (patch: Partial<Prefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      applyPrefs(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* non-fatal */ }
      return next;
    });
  };

  const reset = () => {
    setPrefs(DEFAULT_PREFS);
    applyPrefs(DEFAULT_PREFS);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* non-fatal */ }
  };

  // Esc closes; focus trap inside the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>('button, a[href]');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    // Move focus into the panel when it opens
    const firstBtn = panelRef.current?.querySelector<HTMLElement>('button');
    firstBtn?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8,
    background: '#fff', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit',
  };
  const onBadge = <span style={{ fontSize: 12, fontWeight: 800, color: '#0a7a2f' }}>פעיל ✓</span>;

  return (
    <>
      {/* כפתור פתיחה צף */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        aria-label={open ? 'סגירת תפריט נגישות' : 'פתיחת תפריט נגישות'}
        style={{
          position: 'fixed', bottom: 90, left: 14, zIndex: 99990,
          width: 48, height: 48, borderRadius: '50%',
          background: '#0b57d0', color: '#fff', border: '2px solid #fff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* אייקון נגישות (אדם) — דקורטיבי, השם ב-aria-label */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <path d="M12 2a2.2 2.2 0 1 1 0 4.4A2.2 2.2 0 0 1 12 2zm9 5.5c.1.5-.2 1-.7 1.2l-4.8 1.1v2.6l2.5 7.6c.2.5-.1 1.1-.6 1.3-.5.2-1.1-.1-1.3-.6L12 14.5l-4.1 6.2c-.2.5-.8.8-1.3.6-.5-.2-.8-.8-.6-1.3l2.5-7.6V9.8L3.7 8.7c-.5-.2-.8-.7-.7-1.2.1-.5.7-.9 1.2-.7l5.6 1.3h4.4l5.6-1.3c.5-.2 1.1.2 1.2.7z"/>
        </svg>
      </button>

      {/* פאנל ההגדרות */}
      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-modal="true"
          aria-label="תפריט נגישות"
          style={{
            position: 'fixed', bottom: 146, left: 14, zIndex: 99991,
            width: 280, maxWidth: 'calc(100vw - 28px)', maxHeight: '70vh', overflowY: 'auto',
            background: '#f7f7f7', border: '1px solid #ccc', borderRadius: 12,
            boxShadow: '0 6px 24px rgba(0,0,0,0.3)', padding: 14,
            display: 'flex', flexDirection: 'column', gap: 8, direction: 'rtl',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>תפריט נגישות</h2>
            <button onClick={() => { setOpen(false); btnRef.current?.focus(); }} aria-label="סגירת תפריט נגישות"
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>

          <button style={rowStyle} onClick={() => update({ textStep: ((prefs.textStep + 1) % 3) as 0 | 1 | 2 })}
            aria-pressed={prefs.textStep > 0}>
            <span>הגדלת טקסט</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: prefs.textStep > 0 ? '#0a7a2f' : '#888' }}>
              {prefs.textStep === 0 ? 'רגיל' : prefs.textStep === 1 ? '112%' : '125%'}
            </span>
          </button>

          <button style={rowStyle} onClick={() => update({ contrast: !prefs.contrast })} aria-pressed={prefs.contrast}>
            <span>ניגודיות גבוהה</span>{prefs.contrast && onBadge}
          </button>

          <button style={rowStyle} onClick={() => update({ links: !prefs.links })} aria-pressed={prefs.links}>
            <span>הדגשת קישורים</span>{prefs.links && onBadge}
          </button>

          <button style={rowStyle} onClick={() => update({ noMotion: !prefs.noMotion })} aria-pressed={prefs.noMotion}>
            <span>עצירת אנימציות</span>{prefs.noMotion && onBadge}
          </button>

          <button style={rowStyle} onClick={() => update({ readable: !prefs.readable })} aria-pressed={prefs.readable}>
            <span>פונט קריא</span>{prefs.readable && onBadge}
          </button>

          <button style={{ ...rowStyle, justifyContent: 'center', fontWeight: 700 }} onClick={reset}>
            איפוס הגדרות נגישות
          </button>

          <a href="/legal/accessibility"
            style={{ textAlign: 'center', fontSize: 14, color: '#0b57d0', textDecoration: 'underline', padding: 6 }}>
            הצהרת נגישות
          </a>
        </div>
      )}
    </>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// בורר שפה — כפתור דגל בהדר שפותח חלון בחירה מתחתיו.
// הבחירה נשמרת בקוקי (ys_locale) ולכן גוברת מכאן והלאה על הזיהוי האוטומטי.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LOCALES,
  DEFAULT_LOCALE,
  getLocale,
  splitLocalePath,
  localizePath,
  hasTranslation,
} from '@/app/lib/i18n/config';
import { translate } from '@/app/lib/i18n/dictionaries';

const COOKIE = 'ys_locale';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { locale: current, path } = splitLocalePath(pathname);
  const currentDef = getLocale(current);

  // סגירה בלחיצה בחוץ / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function choose(code: string) {
    setOpen(false);
    if (code === current) return;
    // הבחירה הידנית מנצחת את הזיהוי האוטומטי מכאן והלאה
    document.cookie = `${COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    // אם העמוד הנוכחי עדיין לא מתורגם — עוברים לדף הבית של אותה שפה
    const target = code === DEFAULT_LOCALE
      ? (hasTranslation(path) ? path : '/')
      : (hasTranslation(path) ? localizePath(path, code) : `/${code}`);

    // ?lang=he מונע מה-middleware להחזיר אותנו לשפה שזוהתה אוטומטית
    router.push(code === DEFAULT_LOCALE ? `${target}${target.includes('?') ? '&' : '?'}lang=he` : target);
    router.refresh();
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={translate(current, 'lang.choose')}
        title={translate(current, 'lang.choose')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: '1px solid #E5E0D5', borderRadius: 8,
          padding: compact ? '5px 8px' : '6px 10px', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#374151',
          lineHeight: 1, whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>{currentDef.flag}</span>
        {!compact && <span>{currentDef.label}</span>}
        <span aria-hidden style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={translate(current, 'lang.choose')}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', insetInlineEnd: 0,
            minWidth: 190, background: '#fff', border: '1px solid #E5E0D5',
            borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
            zIndex: 10000, overflow: 'hidden', padding: 4,
          }}
        >
          {LOCALES.map(l => {
            const active = l.code === current;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => choose(l.code)}
                dir={l.dir}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  background: active ? 'rgba(197,160,40,0.12)' : 'transparent',
                  border: 'none', borderRadius: 7, padding: '9px 11px',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                  fontWeight: active ? 800 : 600, color: active ? '#111d3a' : '#374151',
                  textAlign: l.dir === 'rtl' ? 'right' : 'left',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F7F4EC'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }} aria-hidden>{l.flag}</span>
                <span style={{ flex: 1 }}>{l.label}</span>
                {active && <span style={{ color: 'var(--ys-accent)', fontWeight: 900 }} aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

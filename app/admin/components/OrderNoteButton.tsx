'use client';

// ─────────────────────────────────────────────────────────────────────────────
// OrderNoteButton — פתקית הערה פנימית על הזמנה.
//
// לחיצה על הכפתור פותחת פתקית צפה שבה אפשר גם לקרוא וגם לכתוב:
// דחיפות, מתי צריך להוציא, מאיזה ספק להזמין, האם צריך לשלוח לעיצוב וכו'.
//
// ⚠️ נשמר בשדה adminNote — ולא ב-notes. השדה notes הוא ההערה שהלקוח
//    כתב בצ'קאאוט ומוצג לו; דריסה שלו הייתה מוחקת מידע של הלקוח.
//
// שדות במסמך ההזמנה:
//   adminNote          string   — תוכן הפתקית
//   adminNoteUrgent    boolean  — מסמן את השורה כדחופה
//   adminNoteDueDate   string   — 'YYYY-MM-DD', מתי צריך לצאת (אופציונלי)
//   adminNoteUpdatedAt Timestamp
//   adminNoteBy        string   — מי עדכן אחרון
//
// הכתיבה היא ישירות ל-Firestore בצד הלקוח, בדיוק כמו שינוי סטטוס הזמנה
// באותו טאב — לא נדרש API route.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';

export interface OrderNoteValue {
  adminNote?: string;
  adminNoteUrgent?: boolean;
  adminNoteDueDate?: string | null;
  adminNoteUpdatedAt?: { seconds: number } | null;
  adminNoteBy?: string;
}

/** תבניות מהירות — לחיצה מוסיפה שורה לפתקית במקום להקליד מאפס */
const QUICK_SNIPPETS = [
  'לשלוח לעיצוב',
  'להזמין מספק:',
  'ממתין לאישור הלקוח',
  'חסר במלאי',
  'לבדוק כתובת',
];

function fmtUpdated(ts?: { seconds: number } | null): string {
  if (!ts?.seconds) return '';
  return new Date(ts.seconds * 1000).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OrderNoteButton({
  orderId,
  value,
  editorName,
  onSaved,
}: {
  orderId: string;
  value: OrderNoteValue;
  /** שם/אימייל של מי שעורך — נשמר כדי לדעת מי כתב */
  editorName?: string;
  onSaved: (patch: OrderNoteValue) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [text, setText]     = useState(value.adminNote ?? '');
  const [urgent, setUrgent] = useState(!!value.adminNoteUrgent);
  const [due, setDue]       = useState(value.adminNoteDueDate ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const hasNote = !!(value.adminNote ?? '').trim();
  const dirty =
    text !== (value.adminNote ?? '') ||
    urgent !== !!value.adminNoteUrgent ||
    (due || '') !== (value.adminNoteDueDate ?? '');

  // סנכרון כשההזמנה מתרעננת מבחוץ ואין עריכה פתוחה
  useEffect(() => {
    if (open) return;
    setText(value.adminNote ?? '');
    setUrgent(!!value.adminNoteUrgent);
    setDue(value.adminNoteDueDate ?? '');
  }, [value.adminNote, value.adminNoteUrgent, value.adminNoteDueDate, open]);

  // סגירה בלחיצה בחוץ / Escape — עם אזהרה אם יש שינוי שלא נשמר
  useEffect(() => {
    if (!open) return;

    const tryClose = () => {
      if (dirty && !window.confirm('יש שינוי שלא נשמר בפתקית. לסגור בכל זאת?')) return;
      setOpen(false);
      setError(null);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) tryClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tryClose();
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, dirty]);

  useEffect(() => {
    if (open) setTimeout(() => areaRef.current?.focus(), 30);
  }, [open]);

  async function save() {
    setSaving(true);
    setError(null);
    const trimmed = text.trim();
    const patch: OrderNoteValue = {
      adminNote: trimmed,
      adminNoteUrgent: trimmed ? urgent : false,
      adminNoteDueDate: trimmed ? (due || null) : null,
      adminNoteBy: editorName || 'admin',
    };
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        ...patch,
        adminNoteUpdatedAt: serverTimestamp(),
      });
      // התצוגה המקומית לא מקבלת serverTimestamp מיד — משתמשים בשעון הדפדפן
      onSaved({ ...patch, adminNoteUpdatedAt: { seconds: Math.floor(Date.now() / 1000) } });
      setOpen(false);
    } catch (e) {
      console.error('[OrderNoteButton] save failed:', e);
      setError(e instanceof Error ? e.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  function addSnippet(s: string) {
    setText(prev => (prev.trim() ? `${prev.replace(/\s+$/, '')}\n${s} ` : `${s} `));
    setTimeout(() => areaRef.current?.focus(), 10);
  }

  // ── מראה הכפתור: צהוב מלא כשיש הערה, אדום כשדחוף ───────────────────────
  const btnClass = value.adminNoteUrgent && hasNote
    ? 'border-red-400 text-red-800 bg-red-100 hover:bg-red-200'
    : hasNote
      ? 'border-amber-400 text-amber-900 bg-amber-100 hover:bg-amber-200'
      : 'border-gray-300 text-gray-500 bg-white hover:bg-gray-50';

  return (
    <div className="relative inline-block" ref={wrapRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-xs font-bold px-2 py-1 rounded border whitespace-nowrap ${btnClass}`}
        title={hasNote ? (value.adminNote ?? '') : 'הוספת הערה פנימית להזמנה'}
      >
        {value.adminNoteUrgent && hasNote ? '🔴' : '📝'} הערה
        {hasNote && value.adminNoteDueDate ? ` · ${value.adminNoteDueDate.slice(5).split('-').reverse().join('/')}` : ''}
      </button>

      {open && (
        <div
          className="absolute z-40 top-full mt-2 left-0 w-[330px] rounded-xl shadow-2xl border border-amber-300 bg-amber-50 p-3"
          dir="rtl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-amber-900">📝 הערה פנימית</span>
            {value.adminNoteUpdatedAt && (
              <span className="text-[10px] text-amber-700">
                עודכן {fmtUpdated(value.adminNoteUpdatedAt)}
                {value.adminNoteBy ? ` · ${value.adminNoteBy.split('@')[0]}` : ''}
              </span>
            )}
          </div>

          <textarea
            ref={areaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); }
            }}
            rows={5}
            placeholder={'למשל:\nלשלוח לעיצוב עד יום ג׳\nלהזמין מספק: אבי — 60 כיפות פשתן'}
            className="w-full text-sm rounded-lg border border-amber-300 bg-white px-2 py-2 outline-none focus:ring-2 focus:ring-amber-200 resize-y"
          />

          <div className="flex flex-wrap gap-1 mt-2">
            {QUICK_SNIPPETS.map(s => (
              <button
                key={s}
                onClick={() => addSnippet(s)}
                className="text-[10px] font-bold px-2 py-1 rounded-full border border-amber-300 text-amber-900 bg-white hover:bg-amber-100"
              >
                + {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-red-700 cursor-pointer">
              <input type="checkbox" checked={urgent} onChange={e => setUrgent(e.target.checked)} className="w-3.5 h-3.5" />
              דחוף
            </label>
            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              עד תאריך
              <input
                type="date"
                value={due}
                onChange={e => setDue(e.target.value)}
                className="text-xs rounded-lg border border-amber-300 bg-white px-1.5 py-1 outline-none"
              />
            </label>
          </div>

          {error && (
            <div className="mt-2 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
              ❌ {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="text-[10px] text-amber-700">Ctrl+Enter לשמירה</span>
            <div className="flex gap-2">
              {hasNote && (
                <button
                  onClick={() => {
                    if (!window.confirm('למחוק את ההערה?')) return;
                    setText(''); setUrgent(false); setDue('');
                    setTimeout(save, 0);
                  }}
                  disabled={saving}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  מחק
                </button>
              )}
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-700 bg-amber-700 text-white hover:bg-amber-800 disabled:bg-gray-300 disabled:border-gray-300"
              >
                {saving ? 'שומר…' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

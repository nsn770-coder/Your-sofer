'use client';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { getAuthLazy } from '@/lib/authLazy';

const DEFAULT_MSG =
  'הרכישות באתר אינן זמינות כעת. ניתן לעיין במוצרים, והאפשרות להזמנה תחזור בקרוב.';

export default function SiteSettingsTab() {
  const [checkoutEnabled, setCheckoutEnabled] = useState(true);
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ at: string; by: string } | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'siteSettings', 'global'));
        if (snap.exists()) {
          const d = snap.data();
          setCheckoutEnabled(d.checkoutEnabled ?? true);
          setMessage(d.checkoutDisabledMessage ?? DEFAULT_MSG);
          if (d.updatedAt) setSavedInfo({ at: d.updatedAt, by: d.updatedBy ?? '' });
        }
      } catch (e) {
        console.error('[SiteSettingsTab] load:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const auth = await getAuthLazy();
      const email = auth.currentUser?.email ?? 'אדמין';
      const now = new Date().toISOString();
      await setDoc(
        doc(db, 'siteSettings', 'global'),
        {
          checkoutEnabled,
          checkoutDisabledMessage: message,
          updatedAt: now,
          updatedBy: email,
        },
        { merge: true },
      );
      setSavedInfo({ at: new Date(now).toLocaleString('he-IL'), by: email });
    } catch (e) {
      console.error('[SiteSettingsTab] save:', e);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400">טוען הגדרות...</div>;
  }

  return (
    <div className="max-w-2xl space-y-6" dir="rtl">
      {/* ── checkout toggle ── */}
      <div className={`rounded-xl border-2 p-5 ${checkoutEnabled ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-base font-black">
              {checkoutEnabled ? '🟢 הרכישות פעילות' : '🔴 הרכישות מושבתות'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {checkoutEnabled
                ? 'לקוחות יכולים לרכוש. כיבוי חוסם גם את ה-API בצד שרת.'
                : 'כפתור התשלום חסום ב-UI. ה-API מחזיר 503 לכל ניסיון ישיר.'}
            </div>
          </div>
          <button
            onClick={() => setCheckoutEnabled(v => !v)}
            className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              checkoutEnabled ? 'bg-green-500' : 'bg-red-400'
            }`}
            aria-label="החלף מצב רכישות"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                checkoutEnabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!checkoutEnabled && (
          <div className="mt-4">
            <label className="block text-xs font-bold text-gray-600 mb-1">
              הודעה ללקוחות (מוצגת במקום כפתור התשלום):
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none bg-white"
              placeholder={DEFAULT_MSG}
            />
          </div>
        )}
      </div>

      {/* ── save ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? 'שומר...' : 'שמור הגדרות'}
        </button>
        {savedInfo && (
          <span className="text-xs text-gray-400">
            עודכן: {savedInfo.at} על-ידי {savedInfo.by}
          </span>
        )}
      </div>

      {/* ── algolia resync ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
        <div>
          <div className="text-base font-black">🔍 חיפוש (Algolia)</div>
          <div className="text-xs text-gray-500 mt-0.5">
            מסנכרן את אינדקס החיפוש מול Firestore — מוצרים שנמחקו ייעלמו משורת החיפוש.
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={async () => {
              setSyncing(true);
              setSyncResult(null);
              try {
                const auth    = await getAuthLazy();
                const idToken = await auth.currentUser?.getIdToken(true);
                const res     = await fetch('/api/admin/algolia-resync', {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error ?? 'שגיאה לא ידועה');
                setSyncResult({ ok: true, msg: `החיפוש סונכרן — ${json.products} מוצרים פעילים` });
              } catch (e) {
                setSyncResult({ ok: false, msg: e instanceof Error ? e.message : 'שגיאה בסנכרון' });
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="bg-slate-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'מסנכרן...' : '🔄 סנכרן חיפוש (Algolia)'}
          </button>
          {syncResult && (
            <span className={`text-xs font-semibold ${syncResult.ok ? 'text-green-600' : 'text-red-600'}`}>
              {syncResult.ok ? '✅' : '❌'} {syncResult.msg}
            </span>
          )}
        </div>
      </div>

      {/* ── info box ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <div className="font-bold">כיצד החסימה עובדת</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>כניסה לאתר, עיון במוצרים, הוספה לעגלה — ממשיכות לעבוד.</li>
          <li>כפתור "מעבר לתשלום" מושבת עם הודעה ללקוח.</li>
          <li>ה-API <code>/api/payment</code> מחזיר 503 גם אם מתקשרים ישירות — אי אפשר לעקוף.</li>
        </ul>
      </div>
    </div>
  );
}

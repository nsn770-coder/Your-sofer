'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { getAuthLazy } from '@/lib/authLazy';

interface ApprovalView {
  approvalId: string;
  createdAt: number;
  email: string | null;
  ownerMatchesOrder: boolean | null;
  versionNumber: number;
  product: { id: string; name: string; selectedVariants: Record<string, string>; material: { value: string; source: string } | null; color: { value: string; source: string } | null };
  spec: { primaryText: string; secondaryText: string; date: string; color: string; monogramLetters: string; notes: string };
  details: { font: string; style: string; symbol: string; event: string; aiLayers: string[]; warnings: string[] };
  production: { pixelWidth: number; pixelHeight: number; printWidthMm: number | null; printHeightMm: number | null; effectiveDpi: number | null; minDpi: number; ready: boolean; issues: string[] };
  placement: { x: number; y: number; w: number };
  finish: 'print' | 'embroidery';
  mockupKind: 'composite' | 'ai';
  logo: { view: string; download: string; width: number; height: number; bytes: number };
  mockup: { view: string; download: string };
}

/**
 * Order item panel for a design approved in the Logo Studio. Loads the frozen
 * approval snapshot (admin-only API, fresh signed URLs) and shows separately:
 * the approved logo for download, the approved mockup, the design details and
 * the intended placement / print size.
 */
export default function LogoStudioOrderPanel({ approvalId, orderUid }: { approvalId: string; orderUid?: string | null }) {
  const [a, setA] = useState<ApprovalView | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await getAuthLazy();
        const token = await auth.currentUser?.getIdToken();
        const qs = orderUid ? `?orderUid=${encodeURIComponent(orderUid)}` : '';
        const res = await fetch(`/api/admin/logo-studio/approvals/${approvalId}${qs}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || data.error || 'שגיאה');
        if (!cancelled) setA(data);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [approvalId, orderUid]);

  if (err) return <div className="text-xs text-red-700">שגיאה בטעינת העיצוב המאושר: {err}</div>;
  if (!a) return <div className="text-xs text-gray-500">טוען עיצוב מאושר…</div>;
  const p = a.production;

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-lg border border-purple-200 bg-purple-50/50 p-2 text-xs">
      <span className="font-bold text-purple-800">✨ לוגו מסטודיו הלוגו · גרסה {a.versionNumber} · אושר {new Date(a.createdAt).toLocaleString('he-IL')}</span>
      {a.ownerMatchesOrder === false && <span className="font-bold text-red-700">⚠️ העיצוב אושר בחשבון אחר מזה של ההזמנה ({a.email}) — לבדוק מול הלקוח.</span>}
      <div className="flex flex-wrap gap-3">
        <div>
          <div className="font-bold mb-1">לוגו מאושר (PNG שקוף)</div>
          <img src={a.logo.view} alt="לוגו מאושר" style={{ maxWidth: 200, display: 'block', borderRadius: 6, border: '1px solid #ddd6fe', background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px' }} />
          <a href={a.logo.download} target="_blank" rel="noopener noreferrer" className="inline-flex mt-1 items-center gap-1 text-purple-700 bg-white border border-purple-300 rounded-full px-2.5 py-1 hover:underline font-bold">⬇️ הורדת הלוגו</a>
        </div>
        <div>
          <div className="font-bold mb-1">ההדמיה שהלקוח אישר</div>
          <img src={a.mockup.view} alt="הדמיה מאושרת" style={{ maxWidth: 200, display: 'block', borderRadius: 6, border: '1px solid #ddd6fe' }} />
          <a href={a.mockup.download} target="_blank" rel="noopener noreferrer" className="inline-flex mt-1 items-center gap-1 text-purple-700 bg-white border border-purple-300 rounded-full px-2.5 py-1 hover:underline font-bold">⬇️ הורדת ההדמיה</a>
          <div className="text-gray-500 mt-1">{a.mockupKind === 'ai' ? 'הדמיה מציאותית (AI)' : 'הדמיה מבוקרת'} · ההדמיה להמחשה</div>
        </div>
      </div>
      <div className="text-gray-700 leading-6">
        <div><b>פרטי העיצוב:</b> „{a.spec.primaryText}”{a.spec.secondaryText ? ` · „${a.spec.secondaryText}”` : ''}{a.spec.date ? ` · ${a.spec.date}` : ''}{a.spec.monogramLetters ? ` · מונוגרמה: ${a.spec.monogramLetters}` : ''}</div>
        <div>גופן: {a.details.font} · סגנון: {a.details.style} · סמל: {a.details.symbol} · אירוע: {a.details.event} · צבע: <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: a.spec.color, border: '1px solid #ccc' }} /> <span dir="ltr">{a.spec.color}</span></div>
        {a.details.aiLayers.length > 0 && <div>שכבות AI: {a.details.aiLayers.join(', ')}</div>}
        {a.spec.notes && <div>הערות הלקוח: {a.spec.notes}</div>}
        <div>כיפה: {a.product.name}{Object.keys(a.product.selectedVariants).length ? ` · ${Object.entries(a.product.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}` : ''}</div>
        <div><b>גימור:</b> {a.finish === 'embroidery' ? 'רקמה' : 'הדפסה'} · <b>מיקום מיועד:</b> מרכז {Math.round(a.placement.x * 100)}% / {Math.round(a.placement.y * 100)}% מהתמונה, רוחב {Math.round(a.placement.w * 100)}% מרוחב התמונה</div>
        <div><b>קובץ:</b> {p.pixelWidth}×{p.pixelHeight} פיקסלים{p.printWidthMm ? ` · הדפסה מתוכננת ${p.printWidthMm}×${p.printHeightMm} מ״מ · ${p.effectiveDpi} DPI אפקטיבי` : ''}</div>
        {p.ready
          ? <div className="font-bold text-green-700">✓ הקובץ עומד בדרישות הרזולוציה למידות שהוגדרו (מינימום {p.minDpi} DPI)</div>
          : <div className="font-bold text-amber-700">⚠️ לא מסומן „מוכן לייצור”: {p.issues.join(' ')}</div>}
        {a.finish === 'embroidery' && <div className="font-bold text-amber-800">קובץ ה-PNG אינו קובץ למכונת רקמה — נדרשת דיגיטציה נפרדת.</div>}
        {a.details.warnings.map((w, i) => <div key={i} className="text-amber-700">{w}</div>)}
      </div>
    </div>
  );
}

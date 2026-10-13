'use client';
/* eslint-disable @next/next/no-img-element */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAuthLazy } from '@/lib/authLazy';
import { uploadToCloudinary } from '@/app/lib/cloudinary';
import { variantImageKey, isVisualOption, DEFAULT_PRINT_AREA, type LogoStudioProductConfig } from '@/lib/logoStudio/catalog';
import type { StudioKippah } from '@/app/lib/studioKippot';

// ── admin fetch helper (Firebase ID token → server verifies admin) ──────────
async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = await getAuthLazy();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('לא מחובר');
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `שגיאה ${res.status}`);
  return data as T;
}

type Tab = 'codes' | 'customers' | 'products' | 'settings';

const box: React.CSSProperties = { background: '#fff', border: '1px solid #ece6da', borderRadius: 14, padding: 16, marginBottom: 14 };
const inp: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { background: '#51285F', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 800, cursor: 'pointer' };
const btn2: React.CSSProperties = { background: '#fff', color: '#51285F', border: '1px solid #51285F', borderRadius: 10, padding: '7px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 13 };
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, margin: '8px 0 4px', color: '#555' };

export default function AdminLogoStudioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  // קישור ישיר: /admin/logo-studio?tab=products&kippah=<id> (למשל מ"עריכה בדשבורד" בעמוד כיפות לאירועים).
  // התוכן מוצג רק אחרי טעינת ההתחברות בדפדפן, לכן קריאת ה-URL כאן לא יוצרת אי-התאמה ב-hydration.
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === 'undefined') return 'codes';
    const t = new URLSearchParams(window.location.search).get('tab');
    return t === 'customers' || t === 'products' || t === 'settings' ? t : 'codes';
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading, router]);
  if (loading || !user || user.role !== 'admin') return <div className="p-10 text-center text-gray-400">בטעינה...</div>;

  return (
    <div dir="rtl" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 14px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>✨ סטודיו לוגו — ניהול</h1>
      <p style={{ color: '#777', fontSize: 13, marginBottom: 16 }}>קודי המשך, ניסיונות לקוחות, הגדרות מוצרים להדמיה והגדרות כלליות.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {([['codes', '🎟️ קודי המשך'], ['customers', '👤 ניסיונות לקוח'], ['products', '🧢 כיפות והדמיה'], ['settings', '⚙️ הגדרות']] as [Tab, string][]).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...btn2, ...(tab === id ? { background: '#51285F', color: '#fff' } : {}) }}>{l}</button>
        ))}
      </div>
      {tab === 'codes' && <CodesTab />}
      {tab === 'customers' && <CustomersTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ── Codes ───────────────────────────────────────────────────────────────────
interface CodeRow {
  id: string; hint: string; attempts: number; maxRedemptions: number; redemptionCount: number; totalAttemptsGranted: number;
  allowedEmails: string[]; expiresAt: number | null; disabled: boolean; note: string; createdAt: number; status: string;
}
const STATUS_HE: Record<string, string> = { active: 'פעיל', disabled: 'מושבת', expired: 'פג תוקף', used_up: 'נוצל' };

function CodesTab() {
  const [codes, setCodes] = useState<CodeRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ mode: 'random' as 'random' | 'custom', code: '', attempts: 3, maxRedemptions: 1, allowedEmails: '', expiresAt: '', note: '' });
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Record<string, { uid: string; email: string | null; attempts: number; at: number }[]>>({});

  const load = useCallback(() => {
    adminFetch<{ codes: CodeRow[] }>('/api/admin/logo-studio/codes').then(r => setCodes(r.codes)).catch(e => setErr(e.message));
  }, []);
  useEffect(() => { load(); adminFetch<{ settings: { defaultCodeAttempts: number } }>('/api/admin/logo-studio/settings').then(r => setForm(f => ({ ...f, attempts: r.settings.defaultCodeAttempts }))).catch(() => undefined); }, [load]);

  async function create() {
    setBusy(true); setErr(null); setCreated(null);
    try {
      const r = await adminFetch<{ code: string }>('/api/admin/logo-studio/codes', {
        method: 'POST',
        body: JSON.stringify({
          code: form.mode === 'custom' ? form.code : undefined,
          attempts: form.attempts, maxRedemptions: form.maxRedemptions,
          allowedEmails: form.allowedEmails, expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
          note: form.note,
        }),
      });
      setCreated(r.code);
      setForm(f => ({ ...f, code: '', note: '', allowedEmails: '' }));
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try { await adminFetch('/api/admin/logo-studio/codes', { method: 'PATCH', body: JSON.stringify({ id, ...body }) }); load(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function toggleRedemptions(id: string) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    try { const r = await adminFetch<{ redemptions: { uid: string; email: string | null; attempts: number; at: number }[] }>(`/api/admin/logo-studio/codes/${id}`); setRedemptions(p => ({ ...p, [id]: r.redemptions })); }
    catch (e) { setErr((e as Error).message); }
  }

  return (
    <>
      <div style={box}>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>יצירת קוד</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <button style={{ ...btn2, ...(form.mode === 'random' ? { background: '#F6F1FA' } : {}) }} onClick={() => setForm(f => ({ ...f, mode: 'random' }))}>קוד אקראי</button>
          <button style={{ ...btn2, ...(form.mode === 'custom' ? { background: '#F6F1FA' } : {}) }} onClick={() => setForm(f => ({ ...f, mode: 'custom' }))}>טקסט משלי</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {form.mode === 'custom' && (
            <label><span style={lbl}>טקסט הקוד</span><input style={inp} dir="ltr" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="SIMCHA2027" /></label>
          )}
          <label><span style={lbl}>ניסיונות שהקוד מעניק</span><input style={inp} type="number" min={1} max={50} value={form.attempts} onChange={e => setForm(f => ({ ...f, attempts: Number(e.target.value) }))} /></label>
          <label><span style={lbl}>מספר מימושים מרבי</span><input style={inp} type="number" min={1} value={form.maxRedemptions} onChange={e => setForm(f => ({ ...f, maxRedemptions: Number(e.target.value) }))} /></label>
          <label><span style={lbl}>תוקף (לא חובה)</span><input style={inp} type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></label>
          <label style={{ gridColumn: '1 / -1' }}><span style={lbl}>הגבלה ללקוחות מסוימים — אימיילים (ריק = כל לקוח)</span><input style={inp} dir="ltr" value={form.allowedEmails} onChange={e => setForm(f => ({ ...f, allowedEmails: e.target.value }))} placeholder="customer@gmail.com, other@gmail.com" /></label>
          <label style={{ gridColumn: '1 / -1' }}><span style={lbl}>הערה פנימית</span><input style={inp} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="למשל: לקוח בר מצווה — משפחת כהן" /></label>
        </div>
        <p style={{ fontSize: 12, color: '#777', margin: '8px 0' }}>ברירת מחדל: קוד חד־פעמי שמעניק {form.attempts} ניסיונות. מימוש מוסיף ליתרה הקיימת; לקוח לא יכול לממש אותו קוד פעמיים.</p>
        <button style={btn} disabled={busy} onClick={create}>{busy ? 'יוצר…' : 'יצירת קוד'}</button>
        {created && (
          <div style={{ marginTop: 12, background: '#f0f8f2', border: '1px solid #c4e3cc', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13 }}>הקוד נוצר. <b>העתיקו אותו עכשיו</b> — מטעמי אבטחה הוא לא נשמר ולא יוצג שוב:</div>
            <div dir="ltr" style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, margin: '6px 0' }}>{created}</div>
            <button style={btn2} onClick={() => navigator.clipboard?.writeText(created)}>העתקה</button>
          </div>
        )}
        {err && <div style={{ color: '#9b2c22', marginTop: 8 }}>{err}</div>}
      </div>

      <div style={box}>
        <h2 style={{ fontWeight: 800, marginBottom: 8 }}>קודים קיימים</h2>
        {!codes && <div>טוען…</div>}
        {codes && codes.length === 0 && <div style={{ color: '#777' }}>אין קודים עדיין.</div>}
        {codes && codes.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'right', color: '#777' }}>
                <th>קוד</th><th>סטטוס</th><th>ניסיונות</th><th>מימושים</th><th>סה״כ הוענקו</th><th>מוגבל ל</th><th>תוקף</th><th>הערה</th><th></th>
              </tr></thead>
              <tbody>
                {codes.map(c => (
                  <Fragment key={c.id}>
                    <tr style={{ borderTop: '1px solid #eee' }}>
                      <td dir="ltr" style={{ fontFamily: 'monospace' }}>{c.hint}</td>
                      <td>{STATUS_HE[c.status] ?? c.status}</td>
                      <td>{c.attempts}</td>
                      <td>{c.redemptionCount}/{c.maxRedemptions}</td>
                      <td>{c.totalAttemptsGranted ?? 0}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }} dir="ltr">{c.allowedEmails?.length ? c.allowedEmails.join(', ') : 'כולם'}</td>
                      <td>{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('he-IL') : '—'}</td>
                      <td>{c.note}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button style={btn2} onClick={() => patch(c.id, { disabled: !c.disabled })}>{c.disabled ? 'הפעלה' : 'השבתה'}</button>{' '}
                        <button style={btn2} onClick={() => toggleRedemptions(c.id)}>מימושים</button>{' '}
                        <button style={btn2} onClick={() => { const v = prompt('מספר מימושים מרבי חדש', String(c.maxRedemptions)); if (v) patch(c.id, { maxRedemptions: Number(v) }); }}>עריכה</button>
                      </td>
                    </tr>
                    {open === c.id && (
                      <tr><td colSpan={9} style={{ background: '#faf8f4', padding: 8 }}>
                        {(redemptions[c.id] ?? []).length === 0 ? 'אין מימושים.' : (redemptions[c.id] ?? []).map(r => (
                          <div key={r.uid}>{new Date(r.at).toLocaleString('he-IL')} · <span dir="ltr">{r.email ?? r.uid}</span> · +{r.attempts} ניסיונות</div>
                        ))}
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ── Customers ───────────────────────────────────────────────────────────────
function CustomersTab() {
  const [email, setEmail] = useState('');
  const [data, setData] = useState<null | { uid: string; quota: { freeGranted: number; bonusGranted: number; used: number; pending: number; remaining: number }; ledger: { id: string; type: string; amount: number; at: number; hint?: string; projectId?: string; kind?: string }[]; projects: { id: string; versionCount: number; approval: unknown; updatedAt: number }[] }>(null);
  const [err, setErr] = useState<string | null>(null);
  async function search() {
    setErr(null); setData(null);
    try { setData(await adminFetch(`/api/admin/logo-studio/customers?email=${encodeURIComponent(email.trim())}`)); }
    catch (e) { setErr((e as Error).message); }
  }
  return (
    <div style={box}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={inp} dir="ltr" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@gmail.com" onKeyDown={e => e.key === 'Enter' && search()} />
        <button style={btn} onClick={search}>חיפוש</button>
      </div>
      {err && <div style={{ color: '#9b2c22', marginTop: 8 }}>{err}</div>}
      {data && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          <div>חינם: <b>{data.quota.freeGranted}</b> · מקודים: <b>{data.quota.bonusGranted}</b> · נוצלו: <b>{data.quota.used}</b> · בתהליך: {data.quota.pending} · <b>נותרו: {data.quota.remaining}</b></div>
          <h3 style={{ fontWeight: 800, margin: '12px 0 4px' }}>היסטוריה</h3>
          {data.ledger.length === 0 ? <div style={{ color: '#777' }}>אין תנועות.</div> : data.ledger.map(l => (
            <div key={l.id} style={{ fontSize: 13 }}>{new Date(l.at).toLocaleString('he-IL')} · {l.type === 'code' ? `מימוש קוד ${l.hint ?? ''} (+${l.amount})` : `ניצול ניסיון (${l.kind === 'ai_mockup' ? 'הדמיה' : 'לוגו'})`}{l.projectId ? ` · פרויקט ${l.projectId.slice(0, 6)}` : ''}</div>
          ))}
          <h3 style={{ fontWeight: 800, margin: '12px 0 4px' }}>פרויקטים</h3>
          {data.projects.map(p => <div key={p.id} style={{ fontSize: 13 }}>{p.id.slice(0, 8)} · {p.versionCount} גרסאות · {p.approval ? 'אושר' : 'טיוטה'} · {new Date(p.updatedAt).toLocaleDateString('he-IL')}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Products (variant images, print area, mm, finishes) ─────────────────────
interface AdminProduct { id: string; name: string; imgUrl: string | null; images: string[]; variantOptions: { name: string; values: string[] }[]; filterAttributes: Record<string, string>; hidden: boolean; logoStudio: LogoStudioProductConfig; isStyle?: boolean; inventoryProductId?: string | null }

function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const load = useCallback(() => { adminFetch<{ products: AdminProduct[] }>('/api/admin/logo-studio/products').then(r => setProducts(r.products)).catch(e => setErr(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <StudioKippotSection />

      <h2 style={{ fontWeight: 900, fontSize: 17, margin: '26px 0 6px' }}>📦 מוצרים מהקטלוג המסומנים לעיצוב אישי</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>מוצרים שמסומנים לעיצוב אישי (customDesign / isEventKippot) ומופיעים בסטודיו. לכל וריאציה של צבע או בד צריך לשייך תמונה, אחרת לא תוצג עליה הדמיה. כדי שקובץ הלוגו יסומן „מוכן לייצור”, הגדירו את רוחב ההדפסה במ״מ.</p>
      {err && <div style={{ color: '#9b2c22' }}>{err}</div>}
      {!products && <div>טוען…</div>}
      {products?.length === 0 && <div style={{ fontSize: 13, color: '#777' }}>אין מוצרים מסומנים.</div>}
      {products?.map(p => (
        <div key={p.id} style={box}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
            {p.imgUrl && <img src={p.imgUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>{p.name} {p.hidden && <span style={{ color: '#999' }}>(מוסתר)</span>}</div>
              <div style={{ fontSize: 12, color: '#777' }}>
                {p.variantOptions.filter(o => isVisualOption(o.name)).length ? `${Object.keys(p.logoStudio.variantImages ?? {}).length} תמונות וריאציה משויכות` : (p.logoStudio.topImage ? 'יש תמונת עיצוב לצד עליון' : 'צד עליון: תמונת המוצר')}
                {' · '}{(p.logoStudio.bottomImage || Object.keys(p.logoStudio.bottomVariantImages ?? {}).length) ? 'יש תמונת צד תחתון' : 'אין תמונת צד תחתון'}
                {' · '}{p.logoStudio.maxPrintWidthMm ? `רוחב הדפסה ${p.logoStudio.maxPrintWidthMm} מ״מ` : 'רוחב הדפסה לא הוגדר'}
                {p.logoStudio.disabled ? ' · מושבת בסטודיו' : ''}
              </div>
            </div>
            <span>{openId === p.id ? '▲' : '▼'}</span>
          </div>
          {openId === p.id && <ProductEditor p={p} onSaved={load} />}
        </div>
      ))}
    </div>
  );
}

// ── כיפות לעיצוב אישי (Firestore studioKippot) — הוספה, עריכה, הסתרה ─────────
const MATERIAL_HE: Record<StudioKippah['material'], string> = { linen: 'פשתן', satin: 'סאטן' };
const btnSm: React.CSSProperties = { ...btn2, minHeight: 36, display: 'inline-flex', alignItems: 'center', gap: 4 };

function StudioKippotSection() {
  const [kippot, setKippot] = useState<StudioKippah[] | null>(null);
  const [migrated, setMigrated] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const scrolledRef = useRef(false);

  const load = useCallback(() => {
    adminFetch<{ kippot: StudioKippah[]; migrated: boolean }>('/api/admin/studio-kippot')
      .then(r => { setKippot(r.kippot); setMigrated(r.migrated); })
      .catch(e => setErr(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  // ?kippah=<id> → פותחים את הכיפה ומגללים אליה
  useEffect(() => {
    if (!kippot || scrolledRef.current) return;
    scrolledRef.current = true;
    try {
      const id = new URLSearchParams(window.location.search).get('kippah');
      if (id && kippot.some(k => k.id === id)) {
        setOpenId(id);
        setTimeout(() => document.getElementById(`kippah-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch { /* ignore */ }
  }, [kippot]);

  async function toggleActive(k: StudioKippah) {
    setBusyId(k.id); setErr(null);
    try { await adminFetch('/api/admin/studio-kippot', { method: 'PATCH', body: JSON.stringify({ id: k.id, active: !k.active }) }); load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontWeight: 900, fontSize: 17, margin: 0 }}>🧢 כיפות לעיצוב אישי</h2>
        {!adding && <button style={{ ...btn, minHeight: 42 }} onClick={() => { setAdding(true); setOpenId(null); }} disabled={!migrated}>➕ הוספת כיפה לעיצוב אישי</button>}
      </div>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
        הכיפות שמופיעות ברשימת הבחירה בעמוד „כיפות לאירועים” ובסטודיו. <b>תמונת המוצר</b> מוצגת ברשימת הבחירה; <b>תמונות העיצוב</b> הן משטח העיצוב בסטודיו לכל צד. שינוי נשמר ומופיע באתר מיד — בלי שינוי קוד.
      </p>
      {!migrated && (
        <div style={{ ...box, background: '#FFF8E6', borderColor: '#F0D58C', fontSize: 13, lineHeight: 1.7 }}>
          ⚠️ הכיפות עדיין לא הועברו ל-Firestore — מוצגות כרגע מהרשימה הישנה (לקריאה בלבד).<br />
          כדי לנהל אותן מכאן יש להריץ פעם אחת: <code dir="ltr" style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>node scripts/migrateStudioKippot.mjs --live</code>
        </div>
      )}
      {err && <div style={{ color: '#9b2c22', marginBottom: 8 }}>{err}</div>}
      {adding && (
        <div style={{ ...box, borderColor: '#51285F' }}>
          <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>כיפה חדשה לעיצוב אישי</h3>
          <KippahForm onCancel={() => setAdding(false)} onSaved={k => { setAdding(false); setOpenId(k.id); load(); }} />
        </div>
      )}
      {!kippot && !err && <div>טוען…</div>}
      {kippot?.map(k => (
        <div key={k.id} id={`kippah-${k.id}`} style={{ ...box, opacity: k.active ? 1 : 0.7, scrollMarginTop: 80 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '1 1 220px', minWidth: 0, cursor: 'pointer' }} onClick={() => setOpenId(openId === k.id ? null : k.id)}>
              {k.listImage ? <img src={k.listImage} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee', flexShrink: 0 }} /> : <div style={{ width: 56, height: 56, background: '#f3f3f3', borderRadius: 8, flexShrink: 0 }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>
                  {k.label}{' '}
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: k.active ? '#E7F6EC' : '#F1F1F1', color: k.active ? '#17803d' : '#777' }}>{k.active ? 'פעיל' : 'מוסתר'}</span>
                </div>
                <div style={{ fontSize: 12, color: '#777', lineHeight: 1.6 }}>
                  {MATERIAL_HE[k.material]}{k.embroidered ? ' · 🧵 עם רקמה (+₪5)' : ''}
                  {' · '}צדדים: {[k.sides.top && 'עליון', k.sides.bottom && 'תחתון'].filter(Boolean).join(' + ')}
                  {' · '}{k.topDesignImage ? '✅ עיצוב עליון' : '⚪ עליון: תמונת המוצר'}
                  {' · '}{k.bottomDesignImage ? '✅ עיצוב תחתון' : '⚪ אין עיצוב תחתון'}
                  {' · '}{k.sku ? `🔗 ${k.sku}` : 'לא משויך למוצר'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {migrated && (
                <button style={btnSm} disabled={busyId === k.id} onClick={() => toggleActive(k)}>
                  {busyId === k.id ? '…' : k.active ? '🙈 הסתרה' : '👁️ הצגה'}
                </button>
              )}
              <button style={btnSm} onClick={() => setOpenId(openId === k.id ? null : k.id)}>{openId === k.id ? 'סגירה ▲' : 'עריכה ▼'}</button>
            </div>
          </div>
          {openId === k.id && (
            <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
              {migrated
                ? <KippahForm initial={k} onCancel={() => setOpenId(null)} onSaved={() => load()} />
                : <div style={{ fontSize: 13, color: '#777' }}>העריכה תתאפשר אחרי הרצת המיגרציה.</div>}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

/** תמונה אחת: תצוגה מקדימה + העלאה/החלפה ל-Cloudinary + מחיקה (+ הדבקת כתובת) */
function ImageField({ label, hint, value, onChange, fallbackNote }: { label: string; hint?: string; value: string; onChange: (v: string) => void; fallbackNote?: string }) {
  const [showUrl, setShowUrl] = useState(false);
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 10, display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ width: 96, height: 96, borderRadius: 10, border: '1px dashed #d9cfe0', background: '#FBF9FC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
        {value ? <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: '#aaa', textAlign: 'center', padding: 4 }}>{fallbackNote ?? 'אין תמונה'}</span>}
      </div>
      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: '#777', margin: '2px 0 6px', lineHeight: 1.5 }}>{hint}</div>}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <UploadButton onUploaded={onChange} label={value ? 'החלפה' : 'העלאה'} />
          {value && <button type="button" style={{ ...btn2, color: '#9b2c22', borderColor: '#e4b9b4' }} onClick={() => onChange('')}>🗑️ מחיקה</button>}
          <button type="button" style={{ ...btn2, border: 'none', textDecoration: 'underline', padding: '4px 6px' }} onClick={() => setShowUrl(v => !v)}>קישור</button>
        </div>
        {showUrl && <input style={{ ...inp, marginTop: 6 }} dir="ltr" value={value} onChange={e => onChange(e.target.value.trim())} placeholder="https://res.cloudinary.com/dyxzq3ucy/..." />}
      </div>
    </div>
  );
}

interface ProductHit { id: string; name: string; sku: string | null; imgUrl: string | null; cat: string | null; hidden: boolean }

/** חיפוש ובחירה של מוצר קיים לשיוך (מלאי/רווחיות) */
function ProductPicker({ value, onChange }: { value: { productId: string | null; sku: string | null; productName: string | null; imgUrl?: string | null }; onChange: (v: { productId: string | null; sku: string | null; productName: string | null; imgUrl?: string | null }) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ProductHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true); setErr(null);
      try { const r = await adminFetch<{ products: ProductHit[] }>(`/api/admin/studio-kippot/products?q=${encodeURIComponent(term)}`); if (!cancelled) setHits(r.products); }
      catch (e) { if (!cancelled) setErr((e as Error).message); }
      finally { if (!cancelled) setBusy(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  return (
    <div>
      {value.productId ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid #e3d9ea', background: '#FBF9FC', borderRadius: 10, padding: 8, flexWrap: 'wrap' }}>
          {value.imgUrl && <img src={value.imgUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />}
          <div style={{ flex: '1 1 160px', minWidth: 0, fontSize: 13 }}>
            <div style={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value.productName || value.productId}</div>
            <div style={{ fontSize: 11.5, color: '#777' }} dir="ltr">{value.sku ?? value.productId}</div>
          </div>
          <button type="button" style={btn2} onClick={() => onChange({ productId: null, sku: null, productName: null, imgUrl: null })}>הסרת שיוך</button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#9b2c22', marginBottom: 4 }}>לא משויך — הזמנות לא ינוכו מהמלאי.</div>
      )}
      <input style={{ ...inp, marginTop: 6 }} value={q} onChange={e => setQ(e.target.value)} placeholder={value.productId ? 'חיפוש מוצר אחר לשיוך — שם או קוד (UK…)' : 'חיפוש מוצר לשיוך — שם או קוד (UK…)'} />
      {busy && <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>מחפש…</div>}
      {err && <div style={{ fontSize: 12, color: '#9b2c22', marginTop: 4 }}>{err}</div>}
      {hits && !busy && (
        <div style={{ border: '1px solid #eee', borderRadius: 10, marginTop: 6, maxHeight: 280, overflowY: 'auto' }}>
          {hits.length === 0 && <div style={{ padding: 10, fontSize: 12, color: '#777' }}>לא נמצאו מוצרים. אפשר לחפש לפי שם (בקטגוריית כיפות) או לפי קוד מוצר מדויק.</div>}
          {hits.map(h => (
            <button key={h.id} type="button" onClick={() => { onChange({ productId: h.id, sku: h.sku, productName: h.name, imgUrl: h.imgUrl }); setQ(''); setHits(null); }}
              style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', textAlign: 'right', background: '#fff', border: 'none', borderBottom: '1px solid #f3f3f3', padding: '8px 10px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 48 }}>
              {h.imgUrl ? <img src={h.imgUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} /> : <span style={{ width: 36, flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{h.name}</span>
                <span style={{ display: 'block', fontSize: 11, color: '#888' }}>{h.sku ?? h.id}{h.cat ? ` · ${h.cat}` : ''}{h.hidden ? ' · מוסתר בחנות' : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** טופס הוספה / עריכה של כיפת סטודיו */
function KippahForm({ initial, onSaved, onCancel }: { initial?: StudioKippah; onSaved: (k: StudioKippah) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [material, setMaterial] = useState<StudioKippah['material']>(initial?.material ?? 'linen');
  const [materialTouched, setMaterialTouched] = useState(!!initial);
  const [embroidered, setEmbroidered] = useState(initial?.embroidered ?? false);
  const [embroideredTouched, setEmbroideredTouched] = useState(!!initial);
  const [product, setProduct] = useState<{ productId: string | null; sku: string | null; productName: string | null; imgUrl?: string | null }>({ productId: initial?.productId ?? null, sku: initial?.sku ?? null, productName: initial?.productName ?? null });
  const [listImage, setListImage] = useState(initial?.listImage ?? '');
  const [topDesign, setTopDesign] = useState(initial?.topDesignImage ?? '');
  const [bottomDesign, setBottomDesign] = useState(initial?.bottomDesignImage ?? '');
  const [sides, setSides] = useState(initial?.sides ?? { top: true, bottom: true });
  const [active, setActive] = useState(initial?.active ?? true);
  const [showAdv, setShowAdv] = useState(false);
  const st = initial?.studio ?? {};
  const [area, setArea] = useState<Area>(st.printArea ?? DEFAULT_PRINT_AREA);
  const [bArea, setBArea] = useState<Area>(st.bottomPrintArea ?? DEFAULT_PRINT_AREA);
  const [mm, setMm] = useState<string>(st.maxPrintWidthMm ? String(st.maxPrintWidthMm) : '');
  const [bMm, setBMm] = useState<string>(st.bottomMaxPrintWidthMm ? String(st.bottomMaxPrintWidthMm) : '');
  const [finishes, setFinishes] = useState<('print' | 'embroidery')[]>(st.finishes ?? ['print']);
  const [sortOrder, setSortOrder] = useState<string>(initial ? String(initial.sortOrder) : '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function pickProduct(v: typeof product) {
    setProduct(v);
    // ברירות מחדל נוחות: סוג בד לפי שם המוצר, ותמונת רשימה מהמוצר אם עדיין אין
    if (!materialTouched && v.productName) setMaterial(/סאטן|סטאן|סטן|satin/i.test(v.productName) ? 'satin' : 'linen');
    if (!embroideredTouched && v.productName) setEmbroidered(/רקמ[הת]/.test(v.productName));
    if (!listImage && v.imgUrl) setListImage(v.imgUrl);
    if (!label.trim() && v.productName) setLabel(v.productName.replace(/^כיפ(ה|ת)\s+/, '').slice(0, 60));
  }

  async function save() {
    setMsg(null);
    if (!label.trim()) { setMsg({ ok: false, text: 'יש להזין שם.' }); return; }
    if (!listImage) { setMsg({ ok: false, text: 'יש להעלות תמונת מוצר לרשימת הבחירה.' }); return; }
    if (!sides.top && !sides.bottom) { setMsg({ ok: false, text: 'יש לבחור לפחות צד הדפסה אחד.' }); return; }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        label: label.trim(), material, embroidered, productId: product.productId,
        listImage, topDesignImage: topDesign || null, bottomDesignImage: bottomDesign || null,
        sides, active,
        ...(sortOrder !== '' ? { sortOrder: Number(sortOrder) } : {}),
        ...(showAdv || initial ? {
          studio: {
            printArea: area, bottomPrintArea: bArea,
            maxPrintWidthMm: mm ? Number(mm) : null, bottomMaxPrintWidthMm: bMm ? Number(bMm) : null,
            finishes,
          },
        } : {}),
      };
      const r = initial
        ? await adminFetch<{ kippah: StudioKippah }>('/api/admin/studio-kippot', { method: 'PATCH', body: JSON.stringify({ id: initial.id, ...body }) })
        : await adminFetch<{ kippah: StudioKippah }>('/api/admin/studio-kippot', { method: 'POST', body: JSON.stringify(body) });
      setMsg({ ok: true, text: initial ? 'נשמר ✓' : 'הכיפה נוספה ✓ — היא כבר מופיעה בעמוד כיפות לאירועים' });
      onSaved(r.kippah);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  }

  const sectionTitle: React.CSSProperties = { fontWeight: 900, fontSize: 14, margin: '14px 0 6px' };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <label><span style={lbl}>שם הכיפה (מוצג ללקוח)</span>
          <input style={{ ...inp, minHeight: 42 }} value={label} maxLength={60} onChange={e => setLabel(e.target.value)} placeholder="לדוגמה: תכלת" /></label>
        <label><span style={lbl}>סוג בד (קובע את מדרגות המחיר)</span>
          <select style={{ ...inp, minHeight: 42 }} value={material} onChange={e => { setMaterial(e.target.value as StudioKippah['material']); setMaterialTouched(true); }}>
            <option value="linen">פשתן — 14/12/10 ₪</option>
            <option value="satin">סאטן — 8/6 ₪</option>
          </select></label>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, border: `1px solid ${embroidered ? '#51285F' : '#ddd'}`, background: embroidered ? '#F6F1FA' : '#fff', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 700, minHeight: 44, cursor: 'pointer' }}>
        <input type="checkbox" checked={embroidered} onChange={e => { setEmbroidered(e.target.checked); setEmbroideredTouched(true); }} style={{ width: 18, height: 18, flexShrink: 0 }} />
        <span>🧵 כיפה עם רקמה — תוספת ₪5 לכל כיפה בכל מדרגות הכמות
          <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: '#777' }}>
            {material === 'satin' ? 'סאטן: 30–49 → ₪13 · 50+ → ₪11' : 'פשתן: 30–49 → ₪19 · 50–99 → ₪17 · 100+ → ₪15'}{embroidered ? '' : ' (כשמסומן)'}
          </span>
        </span>
      </label>

      <div style={sectionTitle}>מוצר קיים לשיוך</div>
      <ProductPicker value={product} onChange={pickProduct} />

      <div style={sectionTitle}>תמונות</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        <ImageField label="תמונת מוצר — לרשימת הבחירה" hint="מוצגת בעמוד „כיפות לאירועים” ברשימת בחירת הכיפה. לא מוצגת בסטודיו." value={listImage} onChange={setListImage} />
        <ImageField label="תמונת עיצוב — צד עליון" hint="משטח העיצוב בסטודיו כשהלקוח בוחר צד עליון. בלי תמונה — מוצגת תמונת המוצר." value={topDesign} onChange={setTopDesign} fallbackNote="ישתמש בתמונת המוצר" />
        <ImageField label="תמונת עיצוב — צד תחתון" hint="משטח העיצוב בסטודיו כשהלקוח בוחר צד תחתון (פנים הכיפה). בלי תמונה — אין הדמיה לצד התחתון." value={bottomDesign} onChange={setBottomDesign} />
      </div>

      <div style={sectionTitle}>צדדי הדפסה וסטטוס</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {([['top', 'צד עליון'], ['bottom', 'צד תחתון']] as const).map(([sd, l]) => (
          <label key={sd} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${sides[sd] ? '#51285F' : '#ddd'}`, background: sides[sd] ? '#F6F1FA' : '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 700, minHeight: 42, cursor: 'pointer' }}>
            <input type="checkbox" checked={sides[sd]} onChange={e => setSides(s => ({ ...s, [sd]: e.target.checked }))} style={{ width: 18, height: 18 }} /> {l}
          </label>
        ))}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${active ? '#17803d' : '#ddd'}`, background: active ? '#E7F6EC' : '#F7F7F7', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 700, minHeight: 42, cursor: 'pointer' }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: 18, height: 18 }} /> {active ? 'פעיל — מוצג באתר' : 'לא פעיל — מוסתר'}
        </label>
      </div>
      <p style={{ fontSize: 11.5, color: '#777', marginTop: 6 }}>צד שלא מסומן לא יוצע ללקוח בעמוד כיפות לאירועים (למשל „הדפסה למטה” לכיפה בלי צד תחתון).</p>

      <button type="button" style={{ ...btn2, border: 'none', textDecoration: 'underline', padding: '6px 0', marginTop: 4 }} onClick={() => setShowAdv(v => !v)}>
        {showAdv ? '▲ הסתרת הגדרות הדמיה מתקדמות' : '▼ הגדרות הדמיה מתקדמות (אזור הדפסה, רוחב במ״מ, גימורים, סדר)'}
      </button>
      {showAdv && (
        <div style={{ background: '#FAFAFA', border: '1px solid #eee', borderRadius: 12, padding: 10, marginTop: 6 }}>
          <h4 style={{ fontWeight: 800, fontSize: 13 }}>אזור הדפסה עליון (יחסי 0–1)</h4>
          <AreaFields area={area} setArea={setArea} />
          <label><span style={lbl}>רוחב הדפסה פיזי עליון (מ״מ) ברוחב המקסימלי</span><input style={{ ...inp, maxWidth: 200 }} type="number" min={5} max={500} value={mm} onChange={e => setMm(e.target.value)} placeholder="לדוגמה 70" /></label>
          <h4 style={{ fontWeight: 800, fontSize: 13, marginTop: 10 }}>אזור הדפסה תחתון (יחסי 0–1)</h4>
          <AreaFields area={bArea} setArea={setBArea} />
          <label><span style={lbl}>רוחב הדפסה פיזי תחתון (מ״מ) — ריק = כמו העליון</span><input style={{ ...inp, maxWidth: 200 }} type="number" min={5} max={500} value={bMm} onChange={e => setBMm(e.target.value)} placeholder={mm || 'לדוגמה 50'} /></label>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 13, flexWrap: 'wrap' }}>
            <label><input type="checkbox" checked={finishes.includes('print')} onChange={e => setFinishes(f => e.target.checked ? [...new Set([...f, 'print' as const])] : f.filter(x => x !== 'print'))} /> הדפסה</label>
            <label><input type="checkbox" checked={finishes.includes('embroidery')} onChange={e => setFinishes(f => e.target.checked ? [...new Set([...f, 'embroidery' as const])] : f.filter(x => x !== 'embroidery'))} /> רקמה</label>
          </div>
          <label><span style={lbl}>סדר תצוגה ברשימה (מספר קטן = מוקדם)</span><input style={{ ...inp, maxWidth: 160 }} type="number" min={0} value={sortOrder} onChange={e => setSortOrder(e.target.value)} placeholder="אוטומטי — בסוף" /></label>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, position: 'sticky', bottom: 0, background: '#fff', padding: '8px 0' }}>
        <button style={{ ...btn, minHeight: 44, flex: '1 1 160px' }} onClick={save} disabled={busy}>{busy ? 'שומר…' : initial ? 'שמירת שינויים' : 'הוספת הכיפה'}</button>
        <button type="button" style={{ ...btn2, minHeight: 44 }} onClick={onCancel} disabled={busy}>ביטול</button>
        {msg && <span style={{ fontSize: 13, fontWeight: 700, color: msg.ok ? '#17803d' : '#9b2c22' }}>{msg.text}</span>}
      </div>
    </div>
  );
}

type Area = NonNullable<LogoStudioProductConfig['printArea']>;

/** Uploads an image to our Cloudinary (public delivery — product photos only). */
function UploadButton({ onUploaded, label = 'העלאת תמונה' }: { onUploaded: (url: string) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async e => {
        const f = e.target.files?.[0];
        if (!f) return;
        setErr(null);
        if (!/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 10 * 1024 * 1024) { setErr('PNG/JPG/WEBP עד 10MB'); return; }
        setBusy(true);
        try { onUploaded(await uploadToCloudinary(f)); }
        catch { setErr('ההעלאה נכשלה'); }
        finally { setBusy(false); if (ref.current) ref.current.value = ''; }
      }} />
      <button type="button" style={btn2} disabled={busy} onClick={() => ref.current?.click()}>{busy ? 'מעלה…' : `⬆️ ${label}`}</button>
      {err && <span style={{ color: '#9b2c22', fontSize: 11 }}>{err}</span>}
    </span>
  );
}

function ImageRow({ label, value, images, onChange }: { label: string; value: string; images: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 160px) 1fr 56px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {images.length > 0 && (
          <select style={{ ...inp, width: 140 }} value={images.includes(value) ? value : ''} onChange={e => onChange(e.target.value)}>
            <option value="">— מתמונות המוצר —</option>
            {images.map((u, i) => <option key={u} value={u}>תמונה {i + 1}</option>)}
          </select>
        )}
        <input style={{ ...inp, flex: 1, minWidth: 160 }} dir="ltr" value={value} onChange={e => onChange(e.target.value.trim())} placeholder="https://res.cloudinary.com/dyxzq3ucy/..." />
        <UploadButton onUploaded={onChange} label="העלאה" />
        {value && <button type="button" style={{ ...btn2, padding: '4px 8px' }} onClick={() => onChange('')}>✕</button>}
      </div>
      {value ? <img src={value} alt="" style={{ width: 52, height: 52, objectFit: 'contain', border: '1px solid #eee', borderRadius: 6 }} /> : <span style={{ fontSize: 11, color: '#c0392b' }}>חסר</span>}
    </div>
  );
}

function AreaFields({ area, setArea }: { area: Area; setArea: (fn: (a: Area) => Area) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 }}>
      {(['cx', 'cy', 'minW', 'maxW', 'defaultW', 'maxShift'] as const).map(k => (
        <label key={k}><span style={lbl}>{({ cx: 'מרכז X', cy: 'מרכז Y', minW: 'רוחב מינ׳', maxW: 'רוחב מקס׳', defaultW: 'רוחב ברירת מחדל', maxShift: 'תזוזה מרבית' } as const)[k]}</span>
          <input style={inp} type="number" step={0.01} min={0} max={1} value={area[k]} onChange={e => setArea(a => ({ ...a, [k]: Number(e.target.value) }))} /></label>
      ))}
    </div>
  );
}

function ProductEditor({ p, onSaved }: { p: AdminProduct; onSaved: () => void }) {
  const visual = p.variantOptions.filter(o => isVisualOption(o.name));
  const cfg = p.logoStudio;
  const [vi, setVi] = useState<Record<string, string>>(cfg.variantImages ?? {});
  const [bvi, setBvi] = useState<Record<string, string>>(cfg.bottomVariantImages ?? {});
  const [bottomImage, setBottomImage] = useState<string>(cfg.bottomImage ?? '');
  const [topImage, setTopImage] = useState<string>(cfg.topImage ?? '');
  const [area, setArea] = useState<Area>(cfg.printArea ?? DEFAULT_PRINT_AREA);
  const [bArea, setBArea] = useState<Area>(cfg.bottomPrintArea ?? DEFAULT_PRINT_AREA);
  const [mm, setMm] = useState<string>(cfg.maxPrintWidthMm ? String(cfg.maxPrintWidthMm) : '');
  const [bMm, setBMm] = useState<string>(cfg.bottomMaxPrintWidthMm ? String(cfg.bottomMaxPrintWidthMm) : '');
  const [finishes, setFinishes] = useState<('print' | 'embroidery')[]>(cfg.finishes ?? ['print']);
  const [disabled, setDisabled] = useState(!!cfg.disabled);
  const [tab, setTab] = useState<'top' | 'bottom'>('top');
  const [msg, setMsg] = useState<string | null>(null);

  // keys: one per single option value; combined keys when there are two visual options
  const keys: string[] = visual.length <= 1
    ? visual.flatMap(o => o.values.map(v => `${o.name}=${v}`))
    : (() => {
        const [a, b] = visual;
        return a.values.flatMap(va => b.values.map(vb => variantImageKey({ [a.name]: va, [b.name]: vb }, [a.name, b.name])));
      })();

  async function save() {
    setMsg(null);
    try {
      await adminFetch('/api/admin/logo-studio/products', {
        method: 'PATCH',
        body: JSON.stringify({
          productId: p.id,
          logoStudio: {
            ...(p.isStyle ? {} : { variantImages: vi }),
            ...(visual.length === 0 ? { topImage: topImage || null } : {}),
            bottomVariantImages: bvi, bottomImage: bottomImage || null,
            printArea: area, bottomPrintArea: bArea,
            maxPrintWidthMm: mm ? Number(mm) : null, bottomMaxPrintWidthMm: bMm ? Number(bMm) : null,
            finishes, disabled,
          },
        }),
      });
      setMsg('נשמר ✓'); onSaved();
    } catch (e) { setMsg((e as Error).message); }
  }

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
      {Object.keys(p.filterAttributes).length > 0 && <div style={{ fontSize: 12, color: '#777', marginBottom: 8 }}>מאפייני קטלוג: {Object.entries(p.filterAttributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>}
      {p.isStyle && <div style={{ fontSize: 12, color: '#777', marginBottom: 8 }}>דגם מדף כיפות לאירועים · מוצר מלאי משויך: {p.inventoryProductId ?? 'לא משויך (שיוך נעשה בדף /event-kippot)'}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button type="button" style={{ ...btn2, ...(tab === 'top' ? { background: '#51285F', color: '#fff' } : {}) }} onClick={() => setTab('top')}>צד עליון</button>
        <button type="button" style={{ ...btn2, ...(tab === 'bottom' ? { background: '#51285F', color: '#fff' } : {}) }} onClick={() => setTab('bottom')}>צד תחתון (פנים הכיפה)</button>
      </div>

      {tab === 'top' && (
        <>
          {p.isStyle && <p style={{ fontSize: 12, color: '#777' }}>תמונת הצד העליון של הדגם היא התמונה שמוצגת בדף כיפות לאירועים.</p>}
          {!p.isStyle && visual.length > 0 && (
            <>
              <h3 style={{ fontWeight: 800, fontSize: 14 }}>תמונה עליונה לכל וריאציה</h3>
              {keys.map(k => <ImageRow key={k} label={k.replace(/\|/g, ' · ')} value={vi[k] ?? ''} images={p.images} onChange={v => setVi(prev => ({ ...prev, [k]: v }))} />)}
            </>
          )}
          {!p.isStyle && visual.length === 0 && (
            <>
              <h3 style={{ fontWeight: 800, fontSize: 14 }}>תמונת העיצוב לצד העליון</h3>
              <p style={{ fontSize: 12, color: '#777' }}>משטח העיצוב בסטודיו לצד העליון. בלי תמונה — משמשת תמונת המוצר הראשית.</p>
              <ImageRow label="תמונה" value={topImage} images={p.images} onChange={setTopImage} />
            </>
          )}
          <h3 style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>אזור הדפסה עליון (יחסי 0–1)</h3>
          <AreaFields area={area} setArea={setArea} />
          <label><span style={lbl}>רוחב הדפסה פיזי עליון (מ״מ) ברוחב המקסימלי</span><input style={{ ...inp, maxWidth: 200 }} type="number" min={5} max={500} value={mm} onChange={e => setMm(e.target.value)} placeholder="לדוגמה 70" /></label>
        </>
      )}

      {tab === 'bottom' && (
        <>
          <h3 style={{ fontWeight: 800, fontSize: 14 }}>תמונת הצד התחתון</h3>
          <p style={{ fontSize: 12, color: '#777' }}>צלמו את פנים הכיפה מלמעלה, על רקע נקי. בלי תמונה — הלקוח יוכל לעצב לצד התחתון, אבל לא יקבל עליו הדמיה.</p>
          {visual.length === 0
            ? <ImageRow label="תמונה" value={bottomImage} images={p.images} onChange={setBottomImage} />
            : keys.map(k => <ImageRow key={k} label={k.replace(/\|/g, ' · ')} value={bvi[k] ?? ''} images={p.images} onChange={v => setBvi(prev => ({ ...prev, [k]: v }))} />)}
          <h3 style={{ fontWeight: 800, fontSize: 14, marginTop: 12 }}>אזור הדפסה תחתון (יחסי 0–1)</h3>
          <AreaFields area={bArea} setArea={setBArea} />
          <label><span style={lbl}>רוחב הדפסה פיזי תחתון (מ״מ) — ריק = כמו העליון</span><input style={{ ...inp, maxWidth: 200 }} type="number" min={5} max={500} value={bMm} onChange={e => setBMm(e.target.value)} placeholder={mm || 'לדוגמה 50'} /></label>
        </>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 13, flexWrap: 'wrap' }}>
        <label><input type="checkbox" checked={finishes.includes('print')} onChange={e => setFinishes(f => e.target.checked ? [...new Set([...f, 'print' as const])] : f.filter(x => x !== 'print'))} /> הדפסה</label>
        <label><input type="checkbox" checked={finishes.includes('embroidery')} onChange={e => setFinishes(f => e.target.checked ? [...new Set([...f, 'embroidery' as const])] : f.filter(x => x !== 'embroidery'))} /> רקמה</label>
        <label><input type="checkbox" checked={disabled} onChange={e => setDisabled(e.target.checked)} /> להסתיר מהסטודיו</label>
      </div>
      <button style={{ ...btn, marginTop: 10 }} onClick={save}>שמירה</button>
      {msg && <span style={{ marginRight: 10, fontSize: 13 }}>{msg}</span>}
    </div>
  );
}

// ── Settings ────────────────────────────────────────────────────────────────
function SettingsTab() {
  const [s, setS] = useState<null | { freeAttempts: number; minDpi: number; defaultMaxPrintWidthMm: number | null; defaultCodeAttempts: number; contactWhatsapp: string }>(null);
  const [env, setEnv] = useState<null | { gemini: boolean; cloudinarySigned: boolean; codeSecret: boolean }>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { adminFetch<{ settings: NonNullable<typeof s>; env: NonNullable<typeof env> }>('/api/admin/logo-studio/settings').then(r => { setS(r.settings); setEnv(r.env); }).catch(e => setMsg(e.message)); }, []);
  async function save() {
    if (!s) return;
    setMsg(null);
    try { const r = await adminFetch<{ settings: NonNullable<typeof s> }>('/api/admin/logo-studio/settings', { method: 'PUT', body: JSON.stringify(s) }); setS(r.settings); setMsg('נשמר ✓'); }
    catch (e) { setMsg((e as Error).message); }
  }
  if (!s) return <div style={box}>{msg ?? 'טוען…'}</div>;
  return (
    <div style={box}>
      {env && (
        <div style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.8 }}>
          <div>{env.gemini ? '✅' : '❌'} GEMINI_API_KEY (עיטורים, מונוגרמה, שיחה)</div>
          <div>{env.cloudinarySigned ? '✅' : '❌'} CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET (שמירת קבצים פרטיים — חובה)</div>
          <div>{env.codeSecret ? '✅' : '⚠️'} LOGO_STUDIO_CODE_SECRET {env.codeSecret ? '' : '(חסר — נעשה שימוש במפתח נגזר; מומלץ להגדיר)'}</div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        <label><span style={lbl}>ניסיונות חינם ללקוח חדש</span><input style={inp} type="number" min={0} max={20} value={s.freeAttempts} onChange={e => setS({ ...s, freeAttempts: Number(e.target.value) })} /></label>
        <label><span style={lbl}>ניסיונות ברירת מחדל לקוד</span><input style={inp} type="number" min={1} max={50} value={s.defaultCodeAttempts} onChange={e => setS({ ...s, defaultCodeAttempts: Number(e.target.value) })} /></label>
        <label><span style={lbl}>DPI מינימלי לייצור</span><input style={inp} type="number" min={72} value={s.minDpi} onChange={e => setS({ ...s, minDpi: Number(e.target.value) })} /></label>
        <label><span style={lbl}>רוחב הדפסה ברירת מחדל (מ״מ)</span><input style={inp} type="number" value={s.defaultMaxPrintWidthMm ?? ''} onChange={e => setS({ ...s, defaultMaxPrintWidthMm: e.target.value ? Number(e.target.value) : null })} placeholder="לא מוגדר" /></label>
        <label><span style={lbl}>וואטסאפ לפניות לקבלת קוד</span><input style={inp} dir="ltr" value={s.contactWhatsapp} onChange={e => setS({ ...s, contactWhatsapp: e.target.value })} /></label>
      </div>
      <p style={{ fontSize: 12, color: '#777' }}>שימו לב: הודעת החסימה ללקוח מציינת „3 ניסיונות” כפי שהוגדר. שינוי מספר הניסיונות החינמיים חל על לקוחות חדשים בלבד.</p>
      <button style={{ ...btn, marginTop: 10 }} onClick={save}>שמירה</button>
      {msg && <span style={{ marginRight: 10 }}>{msg}</span>}
    </div>
  );
}

'use client';
/* eslint-disable @next/next/no-img-element */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { getAuthLazy } from '@/lib/authLazy';
import { uploadToCloudinary } from '@/app/lib/cloudinary';
import { variantImageKey, isVisualOption, DEFAULT_PRINT_AREA, type LogoStudioProductConfig } from '@/lib/logoStudio/catalog';

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
  const [tab, setTab] = useState<Tab>('codes');

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
      <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>דגמי כיפות לאירועים (מדף /event-kippot) וכיפות שמסומנות לעיצוב אישי (customDesign / isEventKippot). לכל כיפה אפשר להעלות גם תמונה של הצד התחתון. לכל וריאציה של צבע או בד צריך לשייך תמונה, אחרת לא תוצג עליה הדמיה. כדי שקובץ הלוגו יסומן „מוכן לייצור”, הגדירו את רוחב ההדפסה במ״מ.</p>
      {err && <div style={{ color: '#9b2c22' }}>{err}</div>}
      {!products && <div>טוען…</div>}
      {products?.map(p => (
        <div key={p.id} style={box}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
            {p.imgUrl && <img src={p.imgUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{p.name} {p.hidden && <span style={{ color: '#999' }}>(מוסתר)</span>}</div>
              <div style={{ fontSize: 12, color: '#777' }}>
                {p.isStyle ? '🎉 דגם כיפות לאירועים' : p.variantOptions.filter(o => isVisualOption(o.name)).length ? `${Object.keys(p.logoStudio.variantImages ?? {}).length} תמונות וריאציה משויכות` : 'ללא וריאציות צבע/בד'}
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
          {!p.isStyle && visual.length === 0 && <p style={{ fontSize: 12, color: '#777' }}>אין וריאציות צבע/בד — תמונת המוצר הראשית משמשת לצד העליון.</p>}
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

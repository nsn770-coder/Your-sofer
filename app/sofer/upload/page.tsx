'use client';
import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOFER_CATS = ['קלפי מזוזה', 'קלפי תפילין', 'מגילות', 'ספרי תורה'] as const;
const LARGE_CATS = new Set(['מגילות', 'ספרי תורה']);

function calcPrices(soferPrice: number) {
  const commission = Math.round(soferPrice * 0.15);
  const preVat     = soferPrice + commission;
  const vat        = Math.round(preVat * 0.18);
  return { commission, vat, total: preVat + vat };
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const iS: React.CSSProperties = {
  width: '100%', border: '1px solid #e0d9c8', borderRadius: 8, padding: '10px 12px',
  fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
  color: '#0c1a35', outline: 'none', direction: 'rtl',
};
const lS: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 4 };
const tipS: React.CSSProperties = { fontSize: 12, color: '#b8972a', marginTop: 5, lineHeight: 1.5 };
const secS: React.CSSProperties = {
  background: '#fff', borderRadius: 14, padding: '20px 18px',
  marginBottom: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};
const guidanceS: React.CSSProperties = {
  background: 'rgba(197,160,40,0.08)', border: '1px solid rgba(184,151,42,0.28)',
  borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13,
  color: '#5a4a18', lineHeight: 1.65,
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 15, fontWeight: 900, color: '#0c1a35', margin: '0 0 14px' }}>{children}</h2>;
}

// ─── Product draft type ───────────────────────────────────────────────────────

interface Draft {
  name: string; desc: string; cat: string; nusach: string; level: string;
  days: string; soferPrice: number; customerPrice: number;
  imgUrl: string; imgUrl2: string; imgUrl3: string;
}

// ─── Image upload row ─────────────────────────────────────────────────────────

function ImgRow({
  label, fieldKey, url, onUrl, uploading, onUpload, required,
}: {
  label: string; fieldKey: string; url: string;
  onUrl: (v: string) => void; uploading: string | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, f: string) => void;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lS}>{label}{required && <span style={{ color: '#e53e3e' }}> *</span>}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {url && (
          <img src={url} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid #e0d9c8', flexShrink: 0 }} />
        )}
        <label style={{ border: '1px solid #b8972a', color: '#b8972a', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
          {uploading === fieldKey ? 'מעלה...' : url ? 'החלף' : '📷 העלה תמונה'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onUpload(e, fieldKey)} disabled={uploading !== null} />
        </label>
        {url && (
          <input value={url} onChange={e => onUrl(e.target.value)} placeholder="או הדבק URL" style={{ flex: 1, ...iS, padding: '8px 10px', fontSize: 12 }} />
        )}
        {!url && (
          <input value={url} onChange={e => onUrl(e.target.value)} placeholder="או הדבק URL של תמונה" style={{ flex: 1, ...iS, padding: '8px 10px', fontSize: 12 }} />
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SoferUploadPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  // ── Price calculator (Section 1 — independent)
  const [calcPrice, setCalcPrice] = useState('');
  const [calcCat,   setCalcCat]   = useState<string>('קלפי מזוזה');

  // ── Tax status
  const [taxStatus, setTaxStatus] = useState('');

  // ── Form fields
  const [name,       setName]       = useState('');
  const [desc,       setDesc]       = useState('');
  const [cat,        setCat]        = useState('קלפי מזוזה');
  const [nusach,     setNusach]     = useState('אשכנזי');
  const [level,      setLevel]      = useState('כשר לכתחילה');
  const [days,       setDays]       = useState('7-14');
  const [soferPrice, setSoferPrice] = useState('');
  const [imgUrl,     setImgUrl]     = useState('');
  const [imgUrl2,    setImgUrl2]    = useState('');
  const [imgUrl3,    setImgUrl3]    = useState('');

  // ── Upload
  const [uploadingImg, setUploadingImg] = useState<string | null>(null);

  // ── Multi-product drafts
  const [drafts, setDrafts] = useState<Draft[]>([]);

  // ── Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [formError,  setFormError]  = useState('');

  // ── Derived prices (form)
  const spNum = parseFloat(soferPrice) || 0;
  const { commission, vat, total: customerPrice } = calcPrices(spNum);

  // ── Derived prices (calculator)
  const cpNum = parseFloat(calcPrice) || 0;
  const calc  = calcPrices(cpNum);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, field: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res  = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error('שגיאה');
      if (field === 'main')  setImgUrl(data.secure_url);
      if (field === 'img2') setImgUrl2(data.secure_url);
      if (field === 'img3') setImgUrl3(data.secure_url);
    } catch { alert('שגיאה בהעלאת התמונה'); }
    finally { setUploadingImg(null); }
  }

  function buildDraft(): Draft {
    return { name, desc, cat, nusach, level, days, soferPrice: spNum, customerPrice, imgUrl, imgUrl2, imgUrl3 };
  }

  function resetForm() {
    setName(''); setDesc(''); setCat('קלפי מזוזה'); setNusach('אשכנזי');
    setLevel('כשר לכתחילה'); setDays('7-14'); setSoferPrice('');
    setImgUrl(''); setImgUrl2(''); setImgUrl3('');
    setFormError('');
  }

  function handleAddAnother() {
    if (!name.trim() || !soferPrice) { setFormError('יש למלא שם ומחיר לפני הוספת מוצר נוסף'); return; }
    if (!imgUrl) { setFormError('יש להעלות תמונה ראשית לפני הוספת מוצר נוסף'); return; }
    setDrafts(d => [...d, buildDraft()]);
    resetForm();
  }

  async function handleSubmit() {
    setFormError('');
    if (!name.trim() || !soferPrice) { setFormError('יש למלא שם ומחיר'); return; }
    if (!imgUrl) { setFormError('יש להעלות תמונה ראשית'); return; }
    if (!user?.soferId) { setFormError('שגיאה: לא נמצא מזהה סופר. פנה לתמיכה.'); return; }

    const allDrafts = [...drafts, buildDraft()];
    setSubmitting(true);
    try {
      for (const d of allDrafts) {
        await addDoc(collection(db, 'products'), {
          name:        d.name,
          desc:        d.desc,
          cat:         d.cat,
          category:    d.cat,
          nusach:      d.nusach,
          level:       d.level,
          days:        d.days,
          price:       d.customerPrice,
          soferPrice:  d.soferPrice,
          taxStatus:   taxStatus || 'unknown',
          imgUrl:      d.imgUrl  || null,
          imgUrl2:     d.imgUrl2 || null,
          imgUrl3:     d.imgUrl3 || null,
          soferId:     user.soferId,
          soferName:   user.displayName || '',
          status:      'pending',
          priority:    50,
          isBestSeller: false,
          badge:       null,
          was:         null,
          createdAt:   serverTimestamp(),
        });
      }
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setFormError('שגיאה בשליחה. נסה שוב.');
    } finally { setSubmitting(false); }
  }

  // ── Auth gates ────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 18, color: '#888' }}>טוען...</div>
    </div>
  );

  if (!user) return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f8f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>✍️</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', marginBottom: 8 }}>כניסה לאזור הסופרים</h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>כדי להעלות מוצרים, יש להתחבר עם חשבון Google המאושר שלך</p>
        <button onClick={signInWithGoogle} style={{ width: '100%', background: '#0c1a35', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 20, height: 20, filter: 'brightness(0) invert(1)' }} />
          התחבר עם Google
        </button>
      </div>
    </div>
  );

  if (user.role !== 'sofer' && user.role !== 'admin') return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f8f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔒</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0c1a35', marginBottom: 8 }}>אין הרשאה</h1>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>דף זה מיועד לסופרים מאושרים בלבד. אם אתה סופר מאושר, פנה אלינו לתמיכה.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f8f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0c1a35', marginBottom: 12 }}>המוצרים נשלחו לאישור!</h2>
        <p style={{ fontSize: 15, color: '#555', lineHeight: 1.7, marginBottom: 28 }}>נחזור אליך בקרוב לאחר בדיקת המוצרים.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setSubmitted(false); resetForm(); setDrafts([]); setTaxStatus(''); }} style={{ background: '#b8972a', color: '#0c1a35', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>
            העלה עוד מוצרים
          </button>
          <a href="/sofer-dashboard" style={{ display: 'inline-flex', alignItems: 'center', color: '#0c1a35', fontSize: 14, fontWeight: 700, padding: '12px 20px', border: '1.5px solid #0c1a35', borderRadius: 10, textDecoration: 'none' }}>
            לדשבורד שלי
          </a>
        </div>
      </div>
    </div>
  );

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" style={{ background: '#f8f6f2', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Section 0: Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, #0c1a35 0%, #18274a 100%)', borderBottom: '3px solid rgba(184,151,42,0.5)', padding: '32px 20px 28px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#b8972a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>YOUR SOFER</p>
        <h1 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>
          ברוך הבא לאזור העלאת המוצרים 👋
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', maxWidth: 500, margin: '0 auto', lineHeight: 1.75 }}>
          כאן תוכל להציע את מוצרי הסת"ם שלך ללקוחות ברחבי הארץ.<br />
          מלא את הפרטים בקפידה —{' '}
          <strong style={{ color: '#b8972a' }}>מוצר מפורט ומושקע מוכר פי 3 יותר!</strong>
        </p>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(16px,3vw,28px) 14px' }}>

        {/* Saved drafts */}
        {drafts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#555', marginBottom: 8 }}>✅ מוצרים שמורים להגשה ({drafts.length})</div>
            {drafts.map((d, i) => (
              <div key={i} style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 8, padding: '10px 14px', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span><strong>{d.name}</strong> — {d.cat} — ₪{d.customerPrice.toLocaleString()} ללקוח</span>
                <button onClick={() => setDrafts(ds => ds.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Section 1: Price calculator ── */}
        <div style={secS}>
          <div style={{ ...guidanceS, marginBottom: 16 }}>
            💡 <strong>חשב את המחיר הסופי ללקוח לפני מילוי הפרטים</strong>
          </div>
          <SectionTitle>מחשבון מחיר</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lS}>המחיר שלך ₪</label>
              <input type="number" min="0" value={calcPrice} onChange={e => setCalcPrice(e.target.value)} placeholder="0" style={iS} />
            </div>
            <div>
              <label style={lS}>קטגוריה</label>
              <select value={calcCat} onChange={e => setCalcCat(e.target.value)} style={{ ...iS, background: '#fff' }}>
                {SOFER_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Breakdown table */}
          <div style={{ background: '#f8f6f2', borderRadius: 10, border: '1px solid #e0d9c8', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0 }}>
              {[
                { label: 'מחיר הסופר', val: cpNum, bold: false },
                { label: 'עמלת החנות (15%)', val: calc.commission, bold: false },
                { label: 'מע"מ (18%)', val: calc.vat, bold: false },
              ].map(({ label, val }) => (
                <><div key={label + '_l'} style={{ padding: '9px 14px', fontSize: 13, color: '#555', borderBottom: '1px solid #e8e4dc' }}>{label}</div>
                <div key={label + '_v'} style={{ padding: '9px 14px', fontSize: 13, color: '#555', textAlign: 'left', borderBottom: '1px solid #e8e4dc' }}>₪{Math.round(val).toLocaleString()}</div></>
              ))}
              <div style={{ padding: '11px 14px', fontSize: 15, fontWeight: 900, color: '#0c1a35' }}>מחיר ללקוח</div>
              <div style={{ padding: '11px 14px', fontSize: 15, fontWeight: 900, color: '#0c1a35', textAlign: 'left' }}>₪{calc.total.toLocaleString()}</div>
            </div>
          </div>

          {LARGE_CATS.has(calcCat) && cpNum > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: 13, color: '#92400e' }}>
              ⚠️ שים לב: המחיר כולל עלות הגעה לאחר בדיקה
            </div>
          )}
        </div>

        {/* ── Section 2: Tax status ── */}
        <div style={secS}>
          <SectionTitle>סטטוס עוסק</SectionTitle>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 12, margin: '0 0 12px' }}>מה הסטטוס שלך לצרכי מס?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { value: 'osek_patur',    label: '✅ יש לי עוסק פטור' },
              { value: 'osek_morsheh',  label: '✅ עוסק מורשה' },
              { value: 'no_osek',       label: '🔗 אין לי עוסק' },
              { value: 'salary',        label: '📄 אני מעדיף תלוש שכר' },
            ].map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input type="radio" name="taxStatus" value={opt.value} checked={taxStatus === opt.value} onChange={() => setTaxStatus(opt.value)} style={{ marginTop: 3, flexShrink: 0, accentColor: '#b8972a' }} />
                <span style={{ fontSize: 14, color: '#0c1a35', fontWeight: taxStatus === opt.value ? 700 : 400 }}>{opt.label}</span>
              </label>
            ))}
          </div>

          {taxStatus === 'no_osek' && (
            <div style={{ marginTop: 14, background: 'rgba(197,160,40,0.1)', border: '1.5px solid #b8972a', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, color: '#888', textDecoration: 'line-through', marginBottom: 4 }}>עלות רגילה: ₪499</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0c1a35', marginBottom: 6 }}>🎉 לרגל ההשקה — הצטרפות חינם!</div>
              <div style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>פתיחת עוסק פטור דרכנו עם 10% הנחה על השירות</div>
              <a href="https://mycount.co.il/הסופר-שלך/" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', background: '#b8972a', color: '#0c1a35', fontWeight: 900, fontSize: 14, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
                פתחו לי עוסק פטור ←
              </a>
            </div>
          )}
        </div>

        {/* ── Section 3: Images ── */}
        <div style={secS}>
          <div style={guidanceS}>
            📸 <strong>תמונות טובות = יותר מכירות!</strong><br />
            • העלה תמונה ברורה על רקע נייטרלי<br />
            • תמונת מקרוב של הכתב מוסיפה אמינות עצומה<br />
            • מומלץ 2-3 תמונות מזוויות שונות<br />
            • תאורה טובה שווה יותר מאלף מילים
          </div>
          <SectionTitle>תמונות המוצר</SectionTitle>
          <ImgRow label="תמונה ראשית" fieldKey="main" url={imgUrl} onUrl={setImgUrl} uploading={uploadingImg} onUpload={handleUpload} required />
          <ImgRow label="תמונה 2" fieldKey="img2" url={imgUrl2} onUrl={setImgUrl2} uploading={uploadingImg} onUpload={handleUpload} />
          <ImgRow label="תמונה 3" fieldKey="img3" url={imgUrl3} onUrl={setImgUrl3} uploading={uploadingImg} onUpload={handleUpload} />

          {user.soferId && (
            <div style={{ background: '#fff8f0', border: '1px solid #f6ad55', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#744210', marginTop: 4 }}>
              ⚠️ הלקוח יראה גם את <strong>תמונת הפרופיל</strong> שלך! תמונה מקצועית מגבירה אמון ב-60%{' '}
              <a href={`/soferim/${user.soferId}`} style={{ color: '#b8972a', fontWeight: 700, textDecoration: 'underline' }}>עדכן תמונת פרופיל ←</a>
            </div>
          )}
        </div>

        {/* ── Section 4: Product details ── */}
        <div style={secS}>
          <div style={guidanceS}>
            ✍️ <strong>איך לכתוב תיאור שמוכר?</strong><br />
            תאר את החוזקות הייחודיות שלך: וותק ושנות ניסיון, הקפדות מיוחדות (מקווה, זקן וכו׳), הכשרה ותעודות, התמחות בנוסח מסוים
          </div>
          <SectionTitle>פרטי המוצר</SectionTitle>

          <div style={{ display: 'grid', gap: 14 }}>
            {/* Name */}
            <div>
              <label style={lS}>שם המוצר <span style={{ color: '#e53e3e' }}>*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={'לדוגמה: קלף מזוזה מהודר נוסח ספרד — כתב בית יוסף'} style={iS} />
              <div style={tipS}>💡 שם טוב כולל: סוג + נוסח + רמת הידור</div>
            </div>

            {/* Description */}
            <div>
              <label style={lS}>תיאור <span style={{ color: '#e53e3e' }}>*</span></label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="תאר את המוצר, את הכתיבה שלך, ומה מיוחד בך..." rows={5} style={{ ...iS, resize: 'vertical', minHeight: 120 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={tipS}>💡 תיאור של 3-4 משפטים לפחות מוכר הרבה יותר</div>
                <div style={{ fontSize: 11, color: desc.length < 60 ? '#e53e3e' : '#888', marginTop: 5 }}>{desc.length} תווים</div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={lS}>קטגוריה</label>
              <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...iS, background: '#fff' }}>
                {SOFER_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Nusach + Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lS}>נוסח</label>
                <select value={nusach} onChange={e => setNusach(e.target.value)} style={{ ...iS, background: '#fff' }}>
                  <option value="אשכנזי">אשכנזי</option>
                  <option value="ספרדי">ספרדי</option>
                  <option value={'אדמוה"ז'}>{'אדמוה"ז'}</option>
                </select>
              </div>
              <div>
                <label style={lS}>רמת כשרות</label>
                <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...iS, background: '#fff' }}>
                  <option value="כשר לכתחילה">כשר לכתחילה</option>
                  <option value="מהודר">מהודר</option>
                  <option value="מהודר בתכלית">מהודר בתכלית</option>
                </select>
                <div style={tipS}>💡 מהודר נמכר במחיר גבוה יותר</div>
              </div>
            </div>

            {/* Days */}
            <div>
              <label style={lS}>זמן אספקה (ימי עסקים)</label>
              <input value={days} onChange={e => setDays(e.target.value)} placeholder="7-14" style={{ ...iS, maxWidth: 160 }} />
              <div style={tipS}>💡 זמן קצר יותר מגביר את הסיכוי לרכישה</div>
            </div>

            {/* Price */}
            <div>
              <label style={lS}>המחיר שלך ₪ <span style={{ color: '#e53e3e' }}>*</span></label>
              <input type="number" min="0" value={soferPrice} onChange={e => setSoferPrice(e.target.value)} placeholder="0" style={{ ...iS, maxWidth: 160 }} />
              {spNum > 0 && (
                <div style={{ marginTop: 8, background: '#f8f6f2', border: '1px solid #e0d9c8', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: 4 }}><span>+ עמלת החנות (15%)</span><span>₪{commission.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666', marginBottom: 8 }}><span>+ מע"מ (18%)</span><span>₪{vat.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#0c1a35', fontSize: 14, borderTop: '1px solid #e0d9c8', paddingTop: 8 }}><span>מחיר ללקוח</span><span>₪{customerPrice.toLocaleString()}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {formError && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b', marginBottom: 12 }}>
            ⚠️ {formError}
          </div>
        )}

        {/* ── Section 5: Action buttons ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
          <button
            onClick={handleAddAnother}
            disabled={submitting}
            style={{ padding: '14px', border: '2px solid #0c1a35', borderRadius: 10, background: '#fff', color: '#0c1a35', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}
          >
            ➕ הוסף עוד מוצר
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '14px', border: 'none', borderRadius: 10, background: submitting ? '#c8a84e' : '#b8972a', color: '#0c1a35', fontSize: 14, fontWeight: 900, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'שולח...' : `📤 שלח לאישור${drafts.length > 0 ? ` (${drafts.length + 1})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

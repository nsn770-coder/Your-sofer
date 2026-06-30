'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { useAuth } from '@/app/contexts/AuthContext';
import { CATS, getSubCats } from '@/app/constants/categories';

const STAM_ADMIN_CATS = new Set([
  'קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'ספרי תורה', 'בר מצווה',
]);
const SOFER_EDIT_CATS = ['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'בר מצווה'];
const CLOUDINARY = 'https://api.cloudinary.com/v1_1/dyxzq3ucy';

export default function AdminNewProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName]                                   = useState('');
  const [price, setPrice]                                 = useState('');
  const [was, setWas]                                     = useState('');
  const [cat, setCat]                                      = useState(searchParams.get('cat') ?? '');
  const [subCategory, setSubCategory]                      = useState(searchParams.get('subCategory') ?? '');
  const [days, setDays]                                   = useState('7-10');
  const [size, setSize]                                   = useState('');
  const [badge, setBadge]                                 = useState('');
  const [desc, setDesc]                                   = useState('');
  const [extraDesc, setExtraDesc]                         = useState('');
  const [imgUrl, setImgUrl]                               = useState('');
  const [imgUrl2, setImgUrl2]                             = useState('');
  const [imgUrl3, setImgUrl3]                             = useState('');
  const [imgUrl4, setImgUrl4]                             = useState('');
  const [imgUrl5, setImgUrl5]                             = useState('');
  const [videoUrl, setVideoUrl]                           = useState('');
  const [level, setLevel]                                 = useState('');
  const [nusach, setNusach]                               = useState('');
  const [closeupImageUrl, setCloseupImageUrl]             = useState('');
  const [stockCount, setStockCount]                       = useState('');
  const [stockVisible, setStockVisible]                   = useState(true);
  const [sourceUrl, setSourceUrl]                         = useState('');
  const [sku, setSku]                                     = useState('');
  const [warehouseBox, setWarehouseBox]                   = useState('');
  const [hasKlafSelection, setHasKlafSelection]           = useState(false);
  const [isExpertRecommended, setIsExpertRecommended]     = useState(false);
  const [isEventKippot, setIsEventKippot]                 = useState(searchParams.get('isEventKippot') === 'true');
  const [isEventProduct, setIsEventProduct]               = useState(searchParams.get('isEventProduct') === 'true');
  const [priority, setPriority]                           = useState('50');
  const [soferId, setSoferId]                             = useState('');
  const [soferOptions, setSoferOptions]                   = useState<{ id: string; name: string }[]>([]);
  const [marketingIntroTxt, setMarketingIntroTxt]         = useState('');
  const [whoIsItForList, setWhoIsItForList]               = useState<{ emoji: string; text: string }[]>([]);
  const [whyUsList, setWhyUsList]                         = useState<string[]>([]);
  const [whatYouGetList, setWhatYouGetList]               = useState<string[]>([]);
  const [saving, setSaving]                               = useState(false);
  const [uploadingImg, setUploadingImg]                   = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, 'soferim'))
      .then(snap => {
        const data: { id: string; name: string }[] = [];
        snap.forEach(d => data.push({ id: d.id, name: d.data().name }));
        setSoferOptions(data);
      })
      .catch(() => {});
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#111', color: '#ddd5c0', fontFamily: 'Heebo, Arial, sans-serif' }}>
      טוען...
    </div>
  );
  if (!user || user.role !== 'admin') { router.push('/'); return null; }

  const isStam    = STAM_ADMIN_CATS.has(cat);
  const showSofer = SOFER_EDIT_CATS.includes(cat) || !!soferId;
  const showSize  = ['קלפי מזוזה', 'בתי מזוזה'].some(c => cat.includes(c));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, field: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(field);
    try {
      const isVideo = file.type.startsWith('video/');
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'yoursofer_upload');
      const res  = await fetch(`${CLOUDINARY}/${isVideo ? 'video' : 'image'}/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error('שגיאה');
      if      (field === 'main')    setImgUrl(data.secure_url);
      else if (field === 'img2')    setImgUrl2(data.secure_url);
      else if (field === 'img3')    setImgUrl3(data.secure_url);
      else if (field === 'img4')    setImgUrl4(data.secure_url);
      else if (field === 'img5')    setImgUrl5(data.secure_url);
      else if (field === 'video')   setVideoUrl(data.secure_url);
      else if (field === 'closeup') setCloseupImageUrl(data.secure_url);
    } catch { alert('שגיאה בהעלאה'); }
    finally { setUploadingImg(null); e.target.value = ''; }
  }

  async function handleCreate() {
    if (!name.trim() || !price || !cat) { alert('שם, מחיר וקטגוריה הם שדות חובה'); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'products'), {
        name: name.trim(),
        price: Number(price),
        ...(was ? { was: Number(was) } : {}),
        desc,
        ...(extraDesc ? { extraDesc } : {}),
        cat,
        category: cat,
        ...(subCategory ? { subCategory } : {}),
        days,
        ...(size ? { size } : {}),
        ...(badge ? { badge } : {}),
        imgUrl: imgUrl || '',
        ...(imgUrl2 ? { imgUrl2 } : {}),
        ...(imgUrl3 ? { imgUrl3 } : {}),
        ...(imgUrl4 ? { imgUrl4 } : {}),
        ...(imgUrl5 ? { imgUrl5 } : {}),
        ...(videoUrl ? { videoUrl } : {}),
        level: isStam ? level : '',
        ...(isStam && nusach ? { nusach } : {}),
        ...(isStam && closeupImageUrl ? { closeupImageUrl } : {}),
        ...(stockCount ? { stockCount: Number(stockCount) } : {}),
        stockVisible,
        outOfStock: false,
        ...(sourceUrl ? { sourceUrl } : {}),
        hasKlafSelection,
        isExpertRecommended,
        isEventKippot,
        isEventProduct,
        priority: Number(priority) || 0,
        ...(soferId ? { soferId } : {}),
        sku: sku.trim() || null,
        warehouseBox: warehouseBox.trim(),
        ...(marketingIntroTxt ? { marketingIntro: marketingIntroTxt } : {}),
        ...(whoIsItForList.length ? { whoIsItFor: whoIsItForList } : {}),
        ...(whyUsList.length ? { whyUs: whyUsList } : {}),
        ...(whatYouGetList.length ? { whatYouGet: whatYouGetList } : {}),
        status: 'active',
        uploadedBySofer: false,
        isBestSeller: false,
        createdAt: serverTimestamp(),
      });
      router.push(`/product/${ref.id}`);
    } catch (err) {
      console.error(err);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  const iS: React.CSSProperties = { width: '100%', border: '1px solid #243a62', borderRadius: 6, padding: '6px 9px', fontSize: 12, boxSizing: 'border-box', fontFamily: 'inherit', background: '#1a1a1a', color: '#ddd5c0', outline: 'none' };
  const lS: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: '#C5A028', display: 'block', marginBottom: 2, letterSpacing: '0.1em', textTransform: 'uppercase' as const };
  const secS: React.CSSProperties = { borderBottom: '1px solid #243a62', paddingBottom: 14, marginBottom: 14 };
  const secTitleS: React.CSSProperties = { fontSize: 9, fontWeight: 900, color: 'rgba(184,151,42,0.65)', letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 8 };

  const imgFields = [
    { field: 'main', cur: imgUrl,  setter: setImgUrl  },
    { field: 'img2', cur: imgUrl2, setter: setImgUrl2 },
    { field: 'img3', cur: imgUrl3, setter: setImgUrl3 },
    { field: 'img4', cur: imgUrl4, setter: setImgUrl4 },
    { field: 'img5', cur: imgUrl5, setter: setImgUrl5 },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#111', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: '2px solid #C5A028', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>➕</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#e8e0d0' }}>הוספת מוצר חדש</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: '#C5A028', background: 'rgba(184,151,42,0.12)', border: '1px solid rgba(184,151,42,0.25)', padding: '1px 5px', borderRadius: 8 }}>ADMIN</span>
        </div>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

        {/* § בסיסי */}
        <div style={secS}>
          <div style={secTitleS}>§ בסיסי</div>
          <div style={{ display: 'grid', gap: 7 }}>
            <div><label style={lS}>שם *</label><input value={name} onChange={e => setName(e.target.value)} style={iS} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div><label style={lS}>מחיר ₪ *</label><input type="number" value={price} onChange={e => setPrice(e.target.value)} style={iS} /></div>
              <div><label style={lS}>לפני הנחה ₪</label><input type="number" value={was} onChange={e => setWas(e.target.value)} placeholder="–" style={iS} /></div>
            </div>
            <div><label style={lS}>priority</label><input type="number" value={priority} onChange={e => setPriority(e.target.value)} style={iS} /></div>
            <div>
              <label style={lS}>קטגוריה *</label>
              <select value={cat} onChange={e => { setCat(e.target.value); setSubCategory(''); }} style={{ ...iS, background: '#1a1a1a' }}>
                <option value="">-- בחר קטגוריה --</option>
                {cat && !CATS.includes(cat) && <option value={cat}>{cat} (legacy)</option>}
                {CATS.filter(c => c !== 'הכל').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {getSubCats(cat).length > 0 && (
              <div>
                <label style={lS}>תת-קטגוריה <span style={{ fontWeight: 300, opacity: 0.7 }}>(אופציונלי)</span></label>
                <select value={subCategory} onChange={e => setSubCategory(e.target.value)} style={{ ...iS, background: '#1a1a1a' }}>
                  <option value="">-- ללא תת-קטגוריה --</option>
                  {getSubCats(cat).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div><label style={lS}>זמן אספקה</label><input value={days} onChange={e => setDays(e.target.value)} placeholder="7-10" style={iS} /></div>
              <div>
                <label style={lS}>תווית</label>
                <select value={badge} onChange={e => setBadge(e.target.value)} style={{ ...iS, background: '#1a1a1a' }}>
                  <option value="">ללא</option>
                  <option value="חדש">חדש</option>
                  <option value="מבצע">מבצע</option>
                  <option value="פופולרי">פופולרי</option>
                </select>
              </div>
            </div>
            <div><label style={lS}>קוד SKU</label><input value={sku} onChange={e => setSku(e.target.value)} placeholder="UK12345" dir="ltr" style={{ ...iS, fontFamily: 'monospace' }} /></div>
            <div><label style={lS}>מספר ארגז במחסן</label><input value={warehouseBox} onChange={e => setWarehouseBox(e.target.value)} placeholder="14" dir="ltr" style={{ ...iS, fontFamily: 'monospace' }} /></div>
          </div>
        </div>

        {/* § גודל — מזוזה בלבד */}
        {showSize && (
          <div style={secS}>
            <div style={secTitleS}>§ גודל</div>
            <select value={size} onChange={e => setSize(e.target.value)} style={{ ...iS, background: '#1a1a1a' }}>
              <option value="">— בחר גודל —</option>
              {['6','7','10','12','15','20','25','30'].map(s => <option key={s} value={s}>{s} ס"מ</option>)}
            </select>
          </div>
        )}

        {/* § תיאור */}
        <div style={secS}>
          <div style={secTitleS}>§ תיאור</div>
          <div style={{ display: 'grid', gap: 7 }}>
            <div><label style={lS}>תיאור ראשי</label><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} style={{ ...iS, resize: 'vertical' }} /></div>
            <div><label style={lS}>טקסט נוסף</label><textarea value={extraDesc} onChange={e => setExtraDesc(e.target.value)} rows={3} placeholder="יוצג מתחת לתיאור הראשי" style={{ ...iS, resize: 'vertical' }} /></div>
          </div>
        </div>

        {/* § תמונות וסרטון */}
        <div style={secS}>
          <div style={secTitleS}>§ תמונות וסרטון</div>
          {imgFields.map(({ field, cur, setter }, idx) => (
            <div key={field} style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 5 }}>
              {cur && <img src={cur} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 3, border: '1px solid #243a62', flexShrink: 0 }} />}
              <label style={{ border: '1px solid #C5A028', color: '#C5A028', borderRadius: 4, padding: '3px 6px', fontSize: 10, fontWeight: 800, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                {uploadingImg === field ? '…' : '📷'}{idx + 1}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e, field)} />
              </label>
              <input value={cur} onChange={e => setter(e.target.value)} placeholder="URL" style={{ flex: 1, ...iS, padding: '4px 7px', fontSize: 11 }} />
              {cur && <button type="button" onClick={() => setter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: 2, lineHeight: 1, flexShrink: 0 }}>✕</button>}
            </div>
          ))}
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginTop: 4 }}>
            <label style={{ border: '1px solid #7c3aed', color: '#c4b5fd', borderRadius: 4, padding: '3px 6px', fontSize: 10, fontWeight: 800, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
              {uploadingImg === 'video' ? '…' : '🎬'} וידאו
              <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => handleUpload(e, 'video')} />
            </label>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="URL" style={{ flex: 1, ...iS, padding: '4px 7px', fontSize: 11 }} />
          </div>
        </div>

        {/* § סת״ם — STaM categories only */}
        {isStam && (
          <div style={secS}>
            <div style={secTitleS}>§ סת״ם</div>
            <div style={{ display: 'grid', gap: 7 }}>
              <div>
                <label style={lS}>רמת כשרות</label>
                <select value={level} onChange={e => setLevel(e.target.value)} style={{ ...iS, background: '#1a1a1a' }}>
                  <option value="">לא מוגדר</option>
                  <option value="כשר לכתחילה">כשר לכתחילה</option>
                  <option value="מהודר">מהודר</option>
                  <option value="מהודר בתכלית">מהודר בתכלית</option>
                </select>
              </div>
              <div>
                <label style={lS}>נוסח</label>
                <select value={nusach} onChange={e => setNusach(e.target.value)} style={{ ...iS, background: '#1a1a1a' }}>
                  <option value="">לא מוגדר</option>
                  <option value="אשכנזי">אשכנזי</option>
                  <option value="ספרדי">ספרדי</option>
                  <option value={'אדמוה"ז'}>{'אדמוה"ז'}</option>
                </select>
              </div>
              <div>
                <label style={lS}>תמונת מקרוב</label>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {closeupImageUrl && <img src={closeupImageUrl} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 3, border: '1px solid #243a62', flexShrink: 0 }} />}
                  <label style={{ border: '1px solid #C5A028', color: '#C5A028', borderRadius: 4, padding: '3px 6px', fontSize: 10, fontWeight: 800, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                    {uploadingImg === 'closeup' ? '…' : '📷'} העלה
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(e, 'closeup')} />
                  </label>
                  <input value={closeupImageUrl} onChange={e => setCloseupImageUrl(e.target.value)} placeholder="URL" style={{ flex: 1, ...iS, padding: '4px 7px', fontSize: 11 }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* § מלאי */}
        <div style={secS}>
          <div style={secTitleS}>§ מלאי</div>
          <div style={{ display: 'grid', gap: 7 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'end' }}>
              <div><label style={lS}>כמות במלאי</label><input type="number" value={stockCount} onChange={e => setStockCount(e.target.value)} placeholder="–" style={iS} /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, color: '#ddd5c0', whiteSpace: 'nowrap', paddingBottom: 4 }}>
                <input type="checkbox" checked={stockVisible} onChange={e => setStockVisible(e.target.checked)} />
                הצג
              </label>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#ddd5c0' }}>
              <input type="checkbox" checked={hasKlafSelection} onChange={e => setHasKlafSelection(e.target.checked)} />
              אפשר בחירת קלף אישית
              <span style={{ fontSize: 9, color: '#C5A028', fontWeight: 700 }}>hasKlafSelection</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#ddd5c0' }}>
              <input type="checkbox" checked={isExpertRecommended} onChange={e => setIsExpertRecommended(e.target.checked)} />
              ⭐ מומלץ על ידי המומחים שלנו
              <span style={{ fontSize: 9, color: '#C5A028', fontWeight: 700 }}>isExpertRecommended</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#ddd5c0' }}>
              <input type="checkbox" checked={isEventKippot} onChange={e => setIsEventKippot(e.target.checked)} />
              🎩 מחשבון כיפות אירועים
              <span style={{ fontSize: 9, color: '#C5A028', fontWeight: 700 }}>isEventKippot</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#ddd5c0' }}>
              <input type="checkbox" checked={isEventProduct} onChange={e => setIsEventProduct(e.target.checked)} />
              🎪 מוצר לאירועים
              <span style={{ fontSize: 9, color: '#C5A028', fontWeight: 700 }}>isEventProduct</span>
            </label>
            {showSofer && (
              <div>
                <label style={lS}>סופר</label>
                <select value={soferId} onChange={e => setSoferId(e.target.value)} style={{ ...iS, background: '#1a1a1a' }}>
                  <option value="">ללא סופר</option>
                  {soferOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div><label style={lS}>קישור מקור לספק (sourceUrl)</label><input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." style={iS} /></div>
          </div>
        </div>

        {/* § טקסטים */}
        <div style={secS}>
          <div style={secTitleS}>§ טקסטים</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <label style={lS}>הוק רגשי (פסקת פתיחה)</label>
              <textarea value={marketingIntroTxt} onChange={e => setMarketingIntroTxt(e.target.value)} rows={3} placeholder="פסקת הפתיחה..." style={{ ...iS, resize: 'vertical' }} />
            </div>
            <div>
              <label style={lS}>למי זה מתאים</label>
              {whoIsItForList.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 3, marginBottom: 3, alignItems: 'center' }}>
                  <input value={item.emoji} onChange={e => { const a = [...whoIsItForList]; a[i] = { ...a[i], emoji: e.target.value }; setWhoIsItForList(a); }} style={{ ...iS, width: 32, padding: '3px 4px', fontSize: 14, textAlign: 'center', flexShrink: 0 }} />
                  <input value={item.text} onChange={e => { const a = [...whoIsItForList]; a[i] = { ...a[i], text: e.target.value }; setWhoIsItForList(a); }} style={{ flex: 1, ...iS, padding: '3px 6px', fontSize: 11 }} />
                  <button type="button" onClick={() => setWhoIsItForList(whoIsItForList.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: 2, flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setWhoIsItForList([...whoIsItForList, { emoji: '', text: '' }])} style={{ fontSize: 10, color: '#C5A028', background: 'none', border: '1px solid rgba(184,151,42,0.35)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', marginTop: 2 }}>+ הוסף</button>
            </div>
            <div>
              <label style={lS}>למה Your Sofer</label>
              {whyUsList.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                  <input value={item} onChange={e => { const a = [...whyUsList]; a[i] = e.target.value; setWhyUsList(a); }} style={{ flex: 1, ...iS, padding: '3px 6px', fontSize: 11 }} />
                  <button type="button" onClick={() => setWhyUsList(whyUsList.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: 2, flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setWhyUsList([...whyUsList, ''])} style={{ fontSize: 10, color: '#C5A028', background: 'none', border: '1px solid rgba(184,151,42,0.35)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', marginTop: 2 }}>+ הוסף</button>
            </div>
            <div>
              <label style={lS}>מה מקבלים</label>
              {whatYouGetList.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                  <input value={item} onChange={e => { const a = [...whatYouGetList]; a[i] = e.target.value; setWhatYouGetList(a); }} style={{ flex: 1, ...iS, padding: '3px 6px', fontSize: 11 }} />
                  <button type="button" onClick={() => setWhatYouGetList(whatYouGetList.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 12, padding: 2, flexShrink: 0, lineHeight: 1 }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={() => setWhatYouGetList([...whatYouGetList, ''])} style={{ fontSize: 10, color: '#C5A028', background: 'none', border: '1px solid rgba(184,151,42,0.35)', borderRadius: 4, padding: '2px 7px', cursor: 'pointer', marginTop: 2 }}>+ הוסף</button>
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleCreate}
          disabled={saving}
          style={{ width: '100%', padding: '13px', background: saving ? '#5a4a18' : '#C5A028', color: '#1a1a1a', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {saving ? 'שומר...' : '✅ צור מוצר'}
        </button>

      </div>
    </div>
  );
}

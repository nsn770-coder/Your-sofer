'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, addDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

interface WritingSample {
  type: 'image' | 'video';
  url: string;
}

interface SoferData {
  name: string;
  city: string;
  style: string;
  description: string;
  imageUrl: string;
  writingSamples: WritingSample[];
}

interface EditRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  changes: Partial<SoferData>;
  createdAt?: { seconds: number };
  adminNote?: string;
}

const STYLE_OPTIONS = [
  'אשכנז',
  'ספרד',
  'ספרדי',
  'חב"ד',
  'תימני',
  'פרדי',
  'אחר',
];

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '⏳ ממתין לאישור', color: '#92400e', bg: '#fef3c7' },
  approved: { label: '✅ אושר',         color: '#065f46', bg: '#d1fae5' },
  rejected: { label: '❌ נדחה',         color: '#991b1b', bg: '#fee2e2' },
};

const CLOUDINARY_CLOUD  = 'dyxzq3ucy';
const CLOUDINARY_PRESET = 'yoursofer_upload';

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url as string;
}

function isValidVideoUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/.test(url);
}

export default function SoferEditPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [current, setCurrent]       = useState<SoferData | null>(null);
  const [name, setName]             = useState('');
  const [city, setCity]             = useState('');
  const [style, setStyle]           = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl]     = useState('');
  const [samples, setSamples]       = useState<WritingSample[]>([]);

  const [requests, setRequests]     = useState<EditRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  // progress: 0 = idle, 1-100 = uploading, -1 = done
  const [samplesProgress, setSamplesProgress] = useState(0);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [videoError, setVideoError] = useState('');

  const photoInputRef   = useRef<HTMLInputElement>(null);
  const samplesInputRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.push('/');
    if (!loading && user && user.role !== 'sofer' && user.role !== 'admin') router.push('/');
  }, [user, loading]);

  // Load current sofer data + past requests
  useEffect(() => {
    if (!user?.soferId) return;
    (async () => {
      try {
        const soferSnap = await getDoc(doc(db, 'soferim', user.soferId!));
        if (soferSnap.exists()) {
          const d = soferSnap.data() as SoferData;
          setCurrent(d);
          setName(d.name ?? '');
          setCity(d.city ?? '');
          setStyle(d.style ?? '');
          setDescription(d.description ?? '');
          setImageUrl(d.imageUrl ?? '');
          // Normalise writingSamples — may be string[] or WritingSample[]
          const raw = d.writingSamples ?? [];
          setSamples(raw.map((s: unknown) =>
            typeof s === 'string' ? { type: 'image', url: s } : s as WritingSample
          ));
        }
        // Past requests — query by auth uid (soferId field = uid per rules)
        const reqSnap = await getDocs(
          query(
            collection(db, 'sofer_edit_requests'),
            where('soferId', '==', user.uid),
            orderBy('createdAt', 'desc'),
          ),
        );
        const reqs: EditRequest[] = [];
        reqSnap.forEach(d => reqs.push({ id: d.id, ...d.data() } as EditRequest));
        setRequests(reqs);
      } catch (e) {
        console.error(e);
      } finally {
        setDataLoading(false);
      }
    })();
  }, [user]);

  // ── Profile photo upload ──────────────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch {
      setError('שגיאה בהעלאת התמונה. נסה שוב.');
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  }

  // ── Writing samples — multiple image upload with progress ────────────────
  async function handleSamplesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setSamplesProgress(1);
    const uploaded: WritingSample[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i]);
        uploaded.push({ type: 'image', url });
        setSamplesProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setSamples(prev => [...prev, ...uploaded]);
    } catch {
      setError('שגיאה בהעלאת דוגמאות הכתב. נסה שוב.');
    } finally {
      setSamplesProgress(0);
      e.target.value = '';
    }
  }

  // ── Add video link ────────────────────────────────────────────────────────
  function handleAddVideo() {
    const url = videoInput.trim();
    if (!url) return;
    if (!isValidVideoUrl(url)) {
      setVideoError('נא להזין קישור תקין מ-YouTube או Vimeo');
      return;
    }
    setVideoError('');
    setVideoInput('');
    setSamples(prev => [...prev, { type: 'video', url }]);
  }

  // ── Delete sample ─────────────────────────────────────────────────────────
  function deleteSample(idx: number) {
    setSamples(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Compute diff ──────────────────────────────────────────────────────────
  function computeChanges(): Partial<SoferData> {
    if (!current) return { name, city, style, description, imageUrl, writingSamples: samples };
    const diff: Partial<SoferData> = {};
    if (name        !== (current.name        ?? '')) diff.name        = name;
    if (city        !== (current.city        ?? '')) diff.city        = city;
    if (style       !== (current.style       ?? '')) diff.style       = style;
    if (description !== (current.description ?? '')) diff.description = description;
    if (imageUrl    !== (current.imageUrl    ?? '')) diff.imageUrl    = imageUrl;
    // Compare writingSamples
    const origSamples = (current.writingSamples ?? []).map((s: unknown) =>
      typeof s === 'string' ? { type: 'image', url: s } : s as WritingSample
    );
    if (JSON.stringify(samples) !== JSON.stringify(origSamples)) diff.writingSamples = samples;
    return diff;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!user?.soferId) return;

    const changes = computeChanges();
    if (Object.keys(changes).length === 0) {
      setError('לא בוצע שינוי — הנתונים זהים לפרופיל הנוכחי.');
      return;
    }
    if (requests.some(r => r.status === 'pending')) {
      setError('יש כבר בקשה ממתינה לאישור. המתן לתגובת המנהל לפני שליחת בקשה חדשה.');
      return;
    }

    setSaving(true);
    try {
      const newReq = {
        soferId:     user.uid,          // Firebase Auth UID — matches firestore.rules
        soferDocId:  user.soferId,      // soferim/{soferDocId} — used by admin to apply changes
        soferName:   user.displayName ?? current?.name ?? '',
        status:      'pending',
        changes,
        currentData: current,
        createdAt:   serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'sofer_edit_requests'), newReq);
      setRequests(prev => [
        { id: ref.id, ...newReq, status: 'pending', createdAt: { seconds: Date.now() / 1000 } },
        ...prev,
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 5000);
    } catch (e) {
      console.error(e);
      setError('שגיאה בשליחה. נסה שוב.');
    } finally {
      setSaving(false);
    }
  }

  if (loading || dataLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif' }}>
      <div style={{ fontSize: 22 }}>טוען...</div>
    </div>
  );

  if (!user?.soferId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif', direction: 'rtl' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
        <div style={{ fontSize: 17, color: '#555' }}>הפרופיל שלך טרם שויך לחשבון.</div>
      </div>
    </div>
  );

  const fieldStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, textAlign: 'right', direction: 'rtl',
    fontFamily: 'Heebo, Arial, sans-serif', boxSizing: 'border-box', outline: 'none',
    background: '#fff',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 5,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f4', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1a3a2a', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: '#a8c8b4', marginBottom: 3 }}>פורטל סופר</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>✏️ בקשת עריכת פרופיל</div>
        </div>
        <button onClick={() => router.push('/sofer-dashboard')}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ← חזרה לדשבורד
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: '28px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Notice */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#1e40af' }}>
          💡 השינויים ישלחו לאישור מנהל לפני שיפורסמו בפרופיל שלך.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a3a2a', margin: 0 }}>פרטי הפרופיל</h2>

          {/* ── Profile photo ──────────────────────────────── */}
          <div>
            <label style={labelStyle}>תמונת פרופיל</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {imageUrl ? (
                <img src={imageUrl} alt="profile"
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb', flexShrink: 0 }}
                  onError={e => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f3f4f6', border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 28 }}>
                  👤
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  style={{ background: photoUploading ? '#9ca3af' : '#1a3a2a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: photoUploading ? 'not-allowed' : 'pointer' }}>
                  {photoUploading ? '⏳ מעלה...' : '📷 החלף תמונה'}
                </button>
                {imageUrl && (
                  <button type="button" onClick={() => setImageUrl('')}
                    style={{ background: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
                    הסר תמונה
                  </button>
                )}
              </div>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          </div>

          {/* ── Name ──────────────────────────────────────── */}
          <div>
            <label style={labelStyle}>שם מלא</label>
            <input style={fieldStyle} value={name} onChange={e => setName(e.target.value)} placeholder={current?.name} />
          </div>

          {/* ── City ──────────────────────────────────────── */}
          <div>
            <label style={labelStyle}>עיר</label>
            <input style={fieldStyle} value={city} onChange={e => setCity(e.target.value)} placeholder={current?.city} />
          </div>

          {/* ── Style dropdown ────────────────────────────── */}
          <div>
            <label style={labelStyle}>סגנון כתיבה</label>
            <select style={fieldStyle} value={style} onChange={e => setStyle(e.target.value)}>
              <option value="">-- בחר סגנון --</option>
              {STYLE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* ── Description ───────────────────────────────── */}
          <div>
            <label style={labelStyle}>תיאור / קורות חיים</label>
            <textarea
              style={{ ...fieldStyle, minHeight: 110, resize: 'vertical', lineHeight: 1.6 }}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="ספר על עצמך, ניסיונך, התמחויות..."
            />
          </div>

          {/* ── Writing samples ───────────────────────────── */}
          <div>
            <label style={labelStyle}>דוגמאות כתב</label>

            {/* Existing samples grid */}
            {samples.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                {samples.map((s, i) => (
                  <div key={i} style={{ position: 'relative', width: 100, height: 100, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', flexShrink: 0 }}>
                    {s.type === 'image' ? (
                      <img src={s.url} alt={`דוגמה ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 24 }}>▶️</span>
                        <span style={{ fontSize: 9, color: '#a8c8b4', textAlign: 'center', padding: '0 4px', wordBreak: 'break-all' }}>
                          {s.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 20)}...
                        </span>
                      </div>
                    )}
                    <button type="button" onClick={() => deleteSample(i)}
                      style={{
                        position: 'absolute', top: 3, right: 3,
                        background: 'rgba(0,0,0,0.65)', color: '#fff',
                        border: 'none', borderRadius: '50%',
                        width: 22, height: 22, fontSize: 11, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                      }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button"
                onClick={() => samplesInputRef.current?.click()}
                disabled={samplesProgress > 0}
                style={{ background: samplesProgress > 0 ? '#9ca3af' : '#f0fdf4', color: samplesProgress > 0 ? '#fff' : '#1a3a2a', border: '1px solid #86efac', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: samplesProgress > 0 ? 'not-allowed' : 'pointer' }}>
                {samplesProgress > 0 ? `⏳ מעלה ${samplesProgress}%` : '🖼️ הוסף תמונה +'}
              </button>
            </div>
            <input ref={samplesInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleSamplesChange} />

            {/* Progress bar */}
            {samplesProgress > 0 && (
              <div style={{ marginTop: 8, background: '#e5e7eb', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#1a3a2a', width: `${samplesProgress}%`, transition: 'width 0.2s ease' }} />
              </div>
            )}

            {/* Video URL input */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <input
                style={{ ...fieldStyle, flex: 1, minWidth: 200 }}
                value={videoInput}
                onChange={e => { setVideoInput(e.target.value); setVideoError(''); }}
                placeholder="קישור YouTube / Vimeo..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddVideo(); } }}
              />
              <button type="button" onClick={handleAddVideo}
                style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                🎬 הוסף סרטון +
              </button>
            </div>
            {videoError && (
              <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{videoError}</div>
            )}
          </div>

          {/* ── Error / success ───────────────────────────── */}
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#991b1b' }}>
              {error}
            </div>
          )}

          {saved && (
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#065f46', fontWeight: 700 }}>
              ✅ הבקשה נשלחה לאישור המנהל. השינויים יופיעו לאחר אישור.
            </div>
          )}

          <button type="submit" disabled={saving || photoUploading || samplesProgress > 0}
            style={{
              background: (saving || photoUploading || samplesProgress > 0) ? '#9ca3af' : '#1a3a2a',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '13px', fontSize: 15, fontWeight: 700,
              cursor: (saving || photoUploading || samplesProgress > 0) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}>
            {saving ? 'שולח...' : '📨 שלח לאישור'}
          </button>
        </form>

        {/* Past requests */}
        {requests.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1a3a2a', marginBottom: 16, marginTop: 0 }}>הבקשות שלי</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {requests.map(r => {
                const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
                const date = r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('he-IL') : '';
                return (
                  <div key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>{s.label}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{date}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {Object.entries(r.changes).map(([k, v]) => {
                        if (k === 'writingSamples') {
                          const arr = v as WritingSample[];
                          return (
                            <div key={k} style={{ marginBottom: 2 }}>
                              <strong>דוגמאות כתב:</strong> {arr.length} פריטים
                            </div>
                          );
                        }
                        return (
                          <div key={k} style={{ marginBottom: 2 }}>
                            <strong>{k}:</strong> {String(v).slice(0, 80)}{String(v).length > 80 ? '…' : ''}
                          </div>
                        );
                      })}
                    </div>
                    {r.adminNote && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#4b5563', background: '#f9fafb', borderRadius: 6, padding: '6px 10px' }}>
                        💬 הערת מנהל: {r.adminNote}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

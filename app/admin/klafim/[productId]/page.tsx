'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  collection, getDocs, query, where, doc, getDoc,
  addDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';

interface KlafDoc {
  id: string;
  productId: string;
  name: string;
  imageUrl: string;
  status: 'available' | 'sold' | 'reserved';
  createdAt?: any;
  soferName?: string;
}

interface Product {
  id: string;
  name: string;
  cat?: string;
  category?: string;
  imgUrl?: string;
  image_url?: string;
  soferId?: string;
  soferName?: string;
}

interface PendingKlaf {
  file: File;
  previewUrl: string;
  serial: string;
  uploading: boolean;
  error: string;
}

const CAT_PREFIX: Record<string, string> = {
  'קלפי מזוזה': 'MZ',
  'מזוזה': 'MZ',
  'קלפי תפילין': 'TF',
  'תפילין': 'TF',
  'מגילות': 'MG',
  'מגילה': 'MG',
};

function randDigits(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}

function getPrefix(cat: string): string {
  for (const [key, prefix] of Object.entries(CAT_PREFIX)) {
    if (cat.includes(key)) return prefix;
  }
  return 'YS';
}

async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', 'yoursofer_upload');
  const res = await fetch('https://api.cloudinary.com/v1_1/dyxzq3ucy/image/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data.error?.message ?? 'שגיאה בהעלאה');
  return data.secure_url;
}

export default function KlafimProductPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { productId } = useParams<{ productId: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [klafim, setKlafim] = useState<KlafDoc[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pending, setPending] = useState<PendingKlaf[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/');
  }, [user, loading]);

  async function loadData() {
    try {
      const [pSnap, kSnap] = await Promise.all([
        getDoc(doc(db, 'products', productId)),
        getDocs(query(collection(db, 'klafim'), where('productId', '==', productId))),
      ]);
      if (pSnap.exists()) setProduct({ id: pSnap.id, ...pSnap.data() } as Product);

      const items: KlafDoc[] = [];
      kSnap.forEach(d => items.push({ id: d.id, ...d.data() } as KlafDoc));
      items.sort((a, b) => {
        const order = { available: 0, reserved: 1, sold: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      });
      setKlafim(items);
    } catch (e) {
      console.error(e);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin' && productId) loadData();
  }, [user, productId]);

  const prefix = product ? getPrefix(product.cat ?? product.category ?? '') : 'YS';

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setPending(prev => [
      ...prev,
      ...arr.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file),
        serial: `${prefix}-${randDigits(6)}`,
        uploading: false,
        error: '',
      })),
    ]);
  }

  function removePending(idx: number) {
    setPending(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function updateSerial(idx: number, val: string) {
    setPending(prev => prev.map((p, i) => i === idx ? { ...p, serial: val } : p));
  }

  async function handleSave() {
    if (!pending.length || !product) return;
    setSaving(true);
    setSaveError('');
    setSavedCount(0);

    let soferName = product.soferName ?? '';
    if (!soferName && product.soferId) {
      try {
        const sSnap = await getDoc(doc(db, 'soferim', product.soferId));
        if (sSnap.exists()) soferName = sSnap.data().name ?? '';
      } catch { /* ignore */ }
    }

    let successCount = 0;
    const updatedPending = [...pending];

    for (let i = 0; i < updatedPending.length; i++) {
      updatedPending[i] = { ...updatedPending[i], uploading: true, error: '' };
      setPending([...updatedPending]);

      try {
        const imageUrl = await uploadToCloudinary(updatedPending[i].file);
        await addDoc(collection(db, 'klafim'), {
          productId,
          name: updatedPending[i].serial,
          imageUrl,
          status: 'available',
          createdAt: serverTimestamp(),
          soferName,
        });
        URL.revokeObjectURL(updatedPending[i].previewUrl);
        updatedPending.splice(i, 1);
        i--;
        successCount++;
        setPending([...updatedPending]);
        setSavedCount(successCount);
      } catch (err: any) {
        updatedPending[i] = { ...updatedPending[i], uploading: false, error: err.message ?? 'שגיאה' };
        setPending([...updatedPending]);
      }
    }

    setSaving(false);
    if (successCount > 0) loadData();
  }

  async function handleDelete(klafId: string) {
    setDeleting(klafId);
    try {
      await deleteDoc(doc(db, 'klafim', klafId));
      setKlafim(prev => prev.filter(k => k.id !== klafId));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [prefix]);

  if (loading || pageLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Heebo, Arial, sans-serif', color: '#888' }}>
        טוען...
      </div>
    );
  }

  const availableCount = klafim.filter(k => k.status === 'available').length;
  const soldCount = klafim.filter(k => k.status === 'sold').length;
  const reservedCount = klafim.filter(k => k.status === 'reserved').length;

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Heebo, Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0c1a35', borderBottom: '3px solid #b8972a', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#b8972a' }}>📜 ניהול קלפים — {product?.name ?? productId}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
            {availableCount} זמינים · {reservedCount} שמורים · {soldCount} נמכרו
          </div>
        </div>
        <Link href="/admin/klafim" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
          ← חזרה לרשימת מוצרים
        </Link>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px' }}>

        {/* ── Upload section ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e8e0d0', padding: '22px 24px', marginBottom: 28 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0c1a35', marginBottom: 14 }}>העלאת קלפים חדשים</div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? '#b8972a' : '#d0c8b8'}`,
              borderRadius: 10, padding: '28px 20px',
              textAlign: 'center', cursor: 'pointer',
              background: isDragOver ? '#fffbf0' : '#faf9f7',
              transition: 'all 0.15s',
              marginBottom: pending.length ? 18 : 0,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0c1a35', marginBottom: 4 }}>גרור תמונות לכאן</div>
            <div style={{ fontSize: 12, color: '#888' }}>או לחץ לבחירת קבצים · ניתן לבחור מספר תמונות</div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ''; } }}
            />
          </div>

          {/* Pending items */}
          {pending.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pending.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  border: '1px solid #e8e0d0', borderRadius: 10, padding: '10px 14px',
                  background: p.error ? '#fff8f8' : '#fff',
                }}>
                  <img
                    src={p.previewUrl}
                    alt="תצוגה מקדימה"
                    style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #e0d8cc' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>מספר סידורי</div>
                    <input
                      value={p.serial}
                      onChange={e => updateSerial(i, e.target.value)}
                      disabled={p.uploading}
                      style={{
                        border: '1.5px solid #d0c8b8', borderRadius: 7, padding: '6px 10px',
                        fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#0c1a35',
                        width: '100%', maxWidth: 160, background: '#faf9f7',
                      }}
                    />
                    {p.error && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 4 }}>{p.error}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.file.name}
                  </div>
                  {p.uploading ? (
                    <div style={{ fontSize: 12, color: '#b8972a', fontWeight: 700, flexShrink: 0 }}>מעלה...</div>
                  ) : (
                    <button
                      onClick={() => removePending(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 18, flexShrink: 0, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: saving ? '#888' : '#b8972a', color: '#0c1a35',
                    border: 'none', borderRadius: 9, padding: '10px 28px',
                    fontWeight: 800, fontSize: 14, cursor: saving ? 'default' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'מעלה...' : `העלה קלפים (${pending.length})`}
                </button>
                {savedCount > 0 && (
                  <div style={{ fontSize: 13, color: '#15803d', fontWeight: 700 }}>✓ {savedCount} קלפים נשמרו</div>
                )}
                {saveError && <div style={{ fontSize: 13, color: '#c0392b' }}>{saveError}</div>}
              </div>
            </div>
          )}
        </div>

        {/* ── Existing klafim ── */}
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0c1a35', marginBottom: 14 }}>
            קלפים קיימים ({klafim.length})
          </div>
          {klafim.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '1.5px solid #e8e0d0', padding: '36px', textAlign: 'center', color: '#888', fontSize: 14 }}>
              אין קלפים עדיין למוצר זה. העלה קלפים למעלה.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))', gap: 14 }}>
              {klafim.map(klaf => (
                <div key={klaf.id} style={{
                  background: '#fff', borderRadius: 10, overflow: 'hidden',
                  border: `1.5px solid ${klaf.status === 'available' ? '#d4edda' : klaf.status === 'reserved' ? '#fff3cd' : '#e0e0e0'}`,
                  opacity: klaf.status === 'sold' ? 0.65 : 1,
                }}>
                  {/* Image */}
                  <div style={{ position: 'relative', aspectRatio: '3/4', background: '#f0ece0', overflow: 'hidden' }}>
                    <img
                      src={klaf.imageUrl}
                      alt={klaf.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                    {/* Status badge */}
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      fontSize: 9, fontWeight: 700,
                      borderRadius: 4, padding: '2px 7px',
                      background: klaf.status === 'available' ? '#15803d' : klaf.status === 'reserved' ? '#d97706' : '#6b7280',
                      color: '#fff',
                    }}>
                      {klaf.status === 'available' ? 'זמין' : klaf.status === 'reserved' ? 'שמור' : 'נמכר'}
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#0c1a35', marginBottom: 4 }}>
                      {klaf.name}
                    </div>
                    {klaf.status === 'available' && (
                      deleteConfirm === klaf.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => handleDelete(klaf.id)}
                            disabled={deleting === klaf.id}
                            style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 0', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {deleting === klaf.id ? '...' : 'מחק'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            style={{ flex: 1, background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 5, padding: '4px 0', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(klaf.id)}
                          style={{ width: '100%', background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: 5, padding: '4px 0', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                        >
                          מחק
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

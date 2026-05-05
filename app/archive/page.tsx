'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import Link from 'next/link';

interface KlafDoc {
  id: string;
  imageUrl?: string;
  name?: string;
  productName?: string;
  status: string;
  soldAt?: any;
  serialNumber?: string;
}

function formatDate(ts: any): string {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ArchivePage() {
  const [klafim, setKlafim] = useState<KlafDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'klafim'),
      where('status', '==', 'sold'),
      orderBy('soldAt', 'desc'),
      limit(20),
    );
    getDocs(q)
      .then(snap => {
        setKlafim(snap.docs.map(d => ({ id: d.id, ...d.data() } as KlafDoc)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: '#f5f0e8',
      fontFamily: 'Heebo, Arial, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1a35 0%, #18274a 100%)',
        borderBottom: '3px solid #b8972a',
        padding: '36px 24px 28px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 26, color: '#b8972a', marginBottom: 8 }}>✡</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>
          קלפים שנמכרו לאחרונה
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
          ארכיון קלפי סת״מ שנבדקו, אושרו ונמכרו
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px 48px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', fontSize: 15, paddingTop: 48 }}>
            טוען קלפים...
          </div>
        ) : klafim.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', fontSize: 15, paddingTop: 48 }}>
            אין קלפים בארכיון כרגע.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
            gap: 20,
          }}>
            {klafim.map(klaf => (
              <div key={klaf.id} style={{
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.09)',
                border: '1px solid #e8e0d0',
              }}>
                {/* Image */}
                <div style={{ position: 'relative', height: 180, background: '#f0ece0', overflow: 'hidden' }}>
                  {klaf.imageUrl ? (
                    <img
                      src={klaf.imageUrl}
                      alt={klaf.name ?? klaf.productName ?? 'קלף'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 36, color: '#c8b89a',
                    }}>
                      📜
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: '#15803d', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    borderRadius: 6, padding: '3px 8px',
                  }}>
                    ✓ נמכר
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0c1a35', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {klaf.name ?? klaf.productName ?? 'קלף סת״מ'}
                  </div>
                  {klaf.serialNumber && (
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#666', marginBottom: 4, fontWeight: 700 }}>
                      {klaf.serialNumber}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                    נמכר: {formatDate(klaf.soldAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <Link
            href="/"
            style={{ fontSize: 13, color: '#0c1a35', textDecoration: 'underline', opacity: 0.6 }}
          >
            חזרה לדף הראשי
          </Link>
        </div>
      </div>
    </div>
  );
}

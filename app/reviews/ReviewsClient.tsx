'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Review {
  id: string;
  reviewerName: string;
  stars: number;
  text: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | null;
  productName?: string;
  createdAt: { seconds: number } | null;
}

function squareCropUrl(url: string): string {
  if (!url) return url;
  return url.replace('/upload/', '/upload/c_fill,g_auto,w_400,h_400/');
}

function formatReviewerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return parts[0] + ' ' + parts[1].charAt(0) + '.';
}

function formatHeDate(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

const stats = [
  { label: 'רכשו אצלנו',      value: '+4,448 לקוחות' },
  { label: 'דירוג ממוצע',     value: '4.8 ★' },
  { label: 'ביקורות אמיתיות', value: '+247' },
];

export default function ReviewsClient() {
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(
          collection(db, 'reviews'),
          where('approved', '==', true),
        ));
        const list: Review[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() } as Review));
        list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
        setReviews(list);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div dir="rtl" style={{ backgroundColor: '#F5F2EC', minHeight: '100vh', fontFamily: "'Heebo', Arial, sans-serif" }}>
      <section style={{ background: '#1a1a1a', padding: '52px 20px 44px', textAlign: 'center' }}>
        <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: '0 0 10px' }}>מה הלקוחות אומרים</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, margin: '0 0 32px' }}>
          אלפי לקוחות מרוצים ברחבי הארץ שקונים סת״מ בראש שקט
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#C5A028' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 16px 60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: 15 }}>טוען ביקורות...</div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999', fontSize: 15 }}>
            עדיין אין ביקורות מאושרות
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {reviews.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #E0D8CC', borderRadius: 0, overflow: 'hidden' }}>
                {r.mediaUrl && (
                  r.mediaType === 'video' ? (
                    <video
                      controls
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                    >
                      <source src={r.mediaUrl} />
                    </video>
                  ) : (
                    <img
                      src={squareCropUrl(r.mediaUrl)}
                      alt={r.reviewerName}
                      style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  )
                )}
                <div style={{ padding: 20 }}>
                  <div style={{ color: '#C9A227', fontSize: 15, marginBottom: 8 }}>
                    {'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}
                  </div>
                  <p style={{ fontSize: 13.5, color: '#333', lineHeight: 1.75, margin: '0 0 14px', fontStyle: 'italic' }}>
                    &ldquo;{r.text}&rdquo;
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{formatReviewerName(r.reviewerName)}</div>
                      {r.productName && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{r.productName}</div>}
                    </div>
                    {r.createdAt && (
                      <div style={{ fontSize: 11, color: '#aaa' }}>{formatHeDate(r.createdAt.seconds)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

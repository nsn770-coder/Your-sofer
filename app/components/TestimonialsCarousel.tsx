'use client';

import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { useState, useEffect } from 'react';

interface Testimonial {
  id: string;
  name: string;
  city: string;
  text: string;
  rating: number;
  imageUrl: string;
  active: boolean;
}

interface Props {
  testimonials: Testimonial[];
  isMobile: boolean;
}

export default function TestimonialsCarousel({ testimonials, isMobile }: Props) {
  const [testIdx, setTestIdx] = useState(0);

  useEffect(() => {
    if (testimonials.length < 2) return;
    const timer = setInterval(() => setTestIdx(prev => (prev + 1) % testimonials.length), 4000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const t = testimonials[testIdx];
  if (!t) return null;

  return (
    <div style={{ background: '#FAF8F4', padding: isMobile ? '72px 20px' : '96px 24px', direction: 'rtl' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: isMobile ? 24 : 32, fontWeight: 300, color: '#1E3A8A', marginBottom: 10, letterSpacing: '-0.01em' }}>מה הלקוחות אומרים</h2>
        <p style={{ textAlign: 'center', fontSize: 14, color: '#9CA3AF', marginBottom: 48 }}>אלפי לקוחות מרוצים ברחבי הארץ</p>
        <div key={testIdx} style={{ background: '#fff', borderRadius: 0, boxShadow: '0 4px 32px rgba(0,0,0,0.07)', padding: isMobile ? '36px 24px' : '48px 56px', display: 'flex', alignItems: 'flex-start', gap: 32, flexDirection: isMobile ? 'column' : 'row', animation: 'testFadeIn 0.55s ease' }}>
          <div style={{ flexShrink: 0, alignSelf: isMobile ? 'center' : 'flex-start' }}>
            {t.imageUrl ? (
              <img src={optimizeCloudinaryUrl(t.imageUrl, 200)} alt={t.name} width={84} height={84} loading="lazy" style={{ borderRadius: '50%', objectFit: 'cover', border: '3px solid #C5A028' }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#1E3A8A', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #C5A028' }}>
                <span style={{ fontSize: 34, color: '#fff', fontWeight: 900 }}>{t.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ marginBottom: 10 }}>
              {Array.from({ length: 5 }).map((_, si) => (
                <span key={si} style={{ color: si < (t.rating ?? 5) ? '#C5A028' : '#ddd', fontSize: 18 }}>★</span>
              ))}
            </div>
            <p style={{ fontSize: isMobile ? 16 : 18, color: '#4B4F54', lineHeight: 1.8, marginBottom: 20, fontStyle: 'italic' }}>&ldquo;{t.text}&rdquo;</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#1E3A8A' }}>{t.name}</span>
              {t.city && <span style={{ fontSize: 13, color: '#999' }}>· {t.city}</span>}
            </div>
          </div>
        </div>
        {testimonials.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 }}>
            <button onClick={() => setTestIdx(i => (i - 1 + testimonials.length) % testimonials.length)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#C5A028', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }} aria-label="הקודם">‹</button>
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setTestIdx(i)} style={{ width: i === testIdx ? 24 : 10, height: 10, borderRadius: 0, border: 'none', cursor: 'pointer', background: i === testIdx ? '#C5A028' : '#ccc', padding: 0, transition: 'width 0.3s, background 0.3s' }} />
            ))}
            <button onClick={() => setTestIdx(i => (i + 1) % testimonials.length)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#C5A028', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }} aria-label="הבא">›</button>
          </div>
        )}
      </div>
    </div>
  );
}

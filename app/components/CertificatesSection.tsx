'use client';

import { useState } from 'react';

export interface Certificate {
  image?: string;
  title: string;
  description: string;
  alt: string;
}

interface Props {
  certificates: Certificate[];
  heading?: string;
}

export default function CertificatesSection({ certificates, heading = 'תעודות כשרות ואישורים' }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!certificates.length) return null;

  return (
    <>
      <div
        dir="rtl"
        style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #ede8e0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>📜</span>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0c1a35', margin: 0 }}>{heading}</h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))',
          gap: 12,
        }}>
          {certificates.map((cert, i) => (
            <div
              key={i}
              style={{
                border: '1px solid #e8e0d0',
                borderRadius: 10,
                overflow: 'hidden',
                background: '#fffdf8',
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
              }}
            >
              {/* Image / placeholder */}
              <div
                style={{
                  position: 'relative',
                  paddingBottom: '66%',
                  background: '#f5f0e8',
                  cursor: cert.image ? 'zoom-in' : 'default',
                }}
                onClick={() => cert.image && setLightbox(cert.image)}
                role={cert.image ? 'button' : undefined}
                aria-label={cert.image ? `הגדל — ${cert.title}` : undefined}
                tabIndex={cert.image ? 0 : undefined}
                onKeyDown={e => e.key === 'Enter' && cert.image && setLightbox(cert.image)}
              >
                {cert.image ? (
                  <>
                    <img
                      src={cert.image}
                      alt={cert.alt}
                      loading="lazy"
                      decoding="async"
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{
                      position: 'absolute', bottom: 6, left: 6,
                      background: 'rgba(12,26,53,0.72)',
                      color: '#fff', fontSize: 10,
                      padding: '2px 8px', borderRadius: 20,
                      backdropFilter: 'blur(4px)',
                    }}>
                      🔍 הגדל
                    </div>
                  </>
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    color: '#c0a87a', gap: 6,
                  }}>
                    <span style={{ fontSize: 30, opacity: 0.55 }}>📜</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#b0956a', textAlign: 'center', padding: '0 8px', lineHeight: 1.4 }}>
                      תמונה בקרוב
                    </span>
                  </div>
                )}
              </div>

              {/* Text */}
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0c1a35', marginBottom: 4 }}>
                  {cert.title}
                </div>
                <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                  {cert.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="הגדלת תעודה"
        >
          <img
            src={lightbox}
            alt="תעודה"
            style={{
              maxWidth: '90vw', maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 18, left: 18,
              background: 'rgba(255,255,255,0.18)',
              border: 'none', color: '#fff',
              width: 44, height: 44, borderRadius: '50%',
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

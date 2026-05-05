'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';
import Link from 'next/link';

interface CertItem {
  serialNumber: string;
  productName: string;
  type: string;
  qualityLevel: string;
  soferName: string;
  klafImageUrl?: string;
}

interface Certificate {
  certId: string;
  externalOrderId: string;
  customerName: string;
  issuedAt: any;
  items: CertItem[];
  magiaName: string;
  valid: boolean;
}

function formatDate(ts: any): string {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function VerifyPage() {
  const { certId } = useParams<{ certId: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!certId) return;
    getDoc(doc(db, 'certificates', certId)).then(snap => {
      if (snap.exists()) setCert(snap.data() as Certificate);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [certId]);

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0c1a35 0%, #18274a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '48px 16px 48px',
      fontFamily: 'Heebo, Arial, sans-serif',
    }}>
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 28, color: '#b8972a', marginBottom: 4 }}>✡</div>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', color: '#fff', textTransform: 'uppercase' }}>
          Your Sofer
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
          אימות תעודת כשרות
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 16, maxWidth: 560, width: '100%',
        overflow: 'hidden', boxShadow: '0 16px 60px rgba(0,0,0,0.35)',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#888', fontSize: 14 }}>
            בודק תעודה...
          </div>
        ) : !cert ? (
          <>
            <div style={{
              background: '#c0392b', padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>✗</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>תעודה לא נמצאה</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>
                  המספר {certId} אינו מזוהה במערכת
                </div>
              </div>
            </div>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>
                ייתכן שמספר התעודה שגוי, או שהתעודה הוסרה.
                לבירור ניתן לפנות אלינו בוואטסאפ.
              </p>
              <a
                href="https://wa.me/972584877770"
                style={{ display: 'inline-block', marginTop: 16, background: '#25D366', color: '#fff', borderRadius: 8, padding: '10px 24px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
              >
                💬 צרו קשר
              </a>
            </div>
          </>
        ) : !cert.valid ? (
          <>
            <div style={{ background: '#c0392b', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, color: '#fff' }}>✗</span>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>תעודה בוטלה</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 }}>תעודה זו אינה תקפה עוד</div>
              </div>
            </div>
            <div style={{ padding: 24, fontSize: 13, color: '#666', lineHeight: 1.7 }}>
              לפרטים נוספים אנא צרו קשר.
            </div>
          </>
        ) : (
          <>
            {/* Valid header */}
            <div style={{
              background: 'linear-gradient(135deg, #15803d, #166534)',
              padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: '#fff', flexShrink: 0,
              }}>
                ✓
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>תעודה תקפה</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                  הפריטים אומתו ואושרו על פי ההלכה
                </div>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: '24px' }}>
              {/* Cert ID + date */}
              <div style={{
                background: '#f8f6f2', borderRadius: 10, padding: '12px 16px',
                marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>מספר תעודה</div>
                  <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: '#0c1a35', letterSpacing: '0.04em' }}>
                    {cert.certId}
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>תאריך הנפקה</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0c1a35' }}>{formatDate(cert.issuedAt)}</div>
                </div>
              </div>

              {/* Customer */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  שם הלקוח
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0c1a35' }}>{cert.customerName}</div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  פריטים מאושרים ({cert.items.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cert.items.map((item, i) => (
                    <div key={i} style={{
                      border: '1px solid #e8e0d0', borderRadius: 10, overflow: 'hidden',
                    }}>
                      {/* Klaf image */}
                      {item.klafImageUrl && (
                        <div style={{ position: 'relative', height: 140, background: '#f5f0e8', overflow: 'hidden' }}>
                          <img
                            src={item.klafImageUrl}
                            alt={`קלף ${item.productName}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                          {/* Sold badge */}
                          <div style={{
                            position: 'absolute', top: 10, right: 10,
                            background: '#15803d', color: '#fff',
                            fontSize: 11, fontWeight: 700,
                            borderRadius: 6, padding: '3px 10px',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            ✓ נמכר ומאומת
                          </div>
                        </div>
                      )}

                      {/* Item details */}
                      <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: '#0c1a35', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.productName}
                          </div>
                          <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>
                            {item.type} · {item.soferName}
                          </div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                            נבדק על ידי: {cert.magiaName}
                          </div>
                          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                            תאריך בדיקה: {formatDate(cert.issuedAt)}
                          </div>
                          {!item.klafImageUrl && (
                            <div style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              marginTop: 5, background: '#f0fdf4', border: '1px solid #86efac',
                              borderRadius: 6, padding: '2px 8px', fontSize: 10, color: '#15803d', fontWeight: 700,
                            }}>
                              ✓ נמכר ומאומת
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'left', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#0c1a35', fontWeight: 700 }}>
                            {item.serialNumber}
                          </div>
                          <div style={{ fontSize: 10, color: '#15803d', fontWeight: 600, marginTop: 2 }}>
                            {item.qualityLevel}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Magia */}
              <div style={{
                background: 'linear-gradient(90deg, #111d3a 0%, #18274a 100%)',
                border: '1px solid rgba(197,160,40,0.3)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
              }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(197,160,40,0.18)', border: '1.5px solid rgba(197,160,40,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: '#C5A028', fontWeight: 900, flexShrink: 0,
                }}>✓</span>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>נבדק ואושר על ידי</div>
                  <div style={{ fontSize: 14, color: '#C5A028', fontWeight: 800 }}>{cert.magiaName}</div>
                </div>
              </div>

              {/* View full cert */}
              <Link
                href={`/certificate/${cert.certId}`}
                style={{
                  display: 'block', textAlign: 'center',
                  background: '#0c1a35', color: '#b8972a',
                  borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                צפייה בתעודה המלאה →
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
        © Your Sofer · your-sofer.com
      </div>
    </div>
  );
}

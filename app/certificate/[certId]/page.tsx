'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase';

interface CertItem {
  serialNumber: string;
  productName: string;
  type: string;
  category: string;
  qualityLevel: string;
  soferName: string;
}

interface Certificate {
  certId: string;
  orderId: string;
  externalOrderId: string;
  customerName: string;
  customerEmail: string;
  issuedAt: any;
  items: CertItem[];
  magiaName: string;
  valid: boolean;
}

function formatDate(ts: any): string {
  if (!ts) return new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CertificatePage() {
  const { certId } = useParams<{ certId: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (!certId) return;
    getDoc(doc(db, 'certificates', certId)).then(snap => {
      if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
      setCert(snap.data() as Certificate);
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [certId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif', color: '#888' }}>
        טוען תעודה...
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Heebo, Arial, sans-serif', gap: 12 }}>
        <div style={{ fontSize: 48 }}>📜</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#1E3A8A' }}>תעודה לא נמצאה</div>
        <div style={{ fontSize: 13, color: '#888' }}>מספר תעודה: {certId}</div>
      </div>
    );
  }

  const verifyUrl = `https://your-sofer.com/verify/${cert.certId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&color=0c1a35&bgcolor=ffffff&data=${encodeURIComponent(verifyUrl)}`;
  const dateStr = formatDate(cert.issuedAt);

  async function sendEmail() {
    setSendingEmail(true);
    setEmailError('');
    try {
      const res = await fetch('/api/certificate/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId: cert!.certId }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSent(true);
        setTimeout(() => setEmailSent(false), 4000);
      } else {
        setEmailError(data.error ?? 'שגיאה בשליחה');
      }
    } catch (e: any) {
      setEmailError(e.message ?? 'שגיאה בשליחה');
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <>
      {/* Toolbar — hidden when printing */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#1E3A8A', padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#C5A028', fontWeight: 700, fontFamily: 'Heebo, Arial, sans-serif', fontSize: 14 }}>
          תעודת כשרות — {cert.certId}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Send email button — only when email is available */}
          {cert.customerEmail && (
            <button
              onClick={sendEmail}
              disabled={sendingEmail}
              style={{
                background: emailSent ? '#15803d' : '#1a2744',
                color: emailSent ? '#fff' : '#C5A028',
                border: '1.5px solid rgba(184,151,42,0.4)',
                borderRadius: 8, padding: '8px 18px', fontWeight: 700,
                fontSize: 13, cursor: sendingEmail ? 'default' : 'pointer',
                fontFamily: 'Heebo, Arial, sans-serif', whiteSpace: 'nowrap',
                opacity: sendingEmail ? 0.7 : 1,
              }}
            >
              {emailSent ? '✓ נשלח!' : sendingEmail ? 'שולח...' : '✉ שלח למייל'}
            </button>
          )}
          {emailError && (
            <span style={{ fontSize: 12, color: '#ff8080', fontFamily: 'Heebo, Arial, sans-serif' }}>
              {emailError}
            </span>
          )}
          <button
            onClick={() => window.print()}
            style={{
              background: '#C5A028', color: '#1E3A8A', border: 'none',
              borderRadius: 8, padding: '8px 22px', fontWeight: 800,
              fontSize: 14, cursor: 'pointer', fontFamily: 'Heebo, Arial, sans-serif',
              whiteSpace: 'nowrap',
            }}
          >
            הדפסה / שמירה כ-PDF ↓
          </button>
        </div>
      </div>

      {/* Page background */}
      <div style={{
        minHeight: '100vh', background: '#f5f0e8',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 64, paddingBottom: 40,
        fontFamily: "'Heebo', Arial, sans-serif",
      }}>
        {/* A4 Certificate */}
        <div id="certificate" dir="rtl" style={{
          width: '210mm',
          minHeight: '297mm',
          background: '#fff',
          padding: '16mm 14mm',
          position: 'relative',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          boxSizing: 'border-box',
          // Double gold border
          border: '3px solid #C5A028',
          outline: '8px solid rgba(184,151,42,0.15)',
          outlineOffset: '-12px',
        }}>

          {/* ── Header ── */}
          <div style={{ textAlign: 'center', paddingBottom: 14, marginBottom: 18, borderBottom: '2.5px solid #C5A028' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8 }}>
              <span style={{ fontSize: 26, color: '#C5A028' }}>✡</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: '#1E3A8A', textTransform: 'uppercase' }}>
                  Your Sofer · יואר סופר
                </div>
                <div style={{ fontSize: 8, color: '#888', letterSpacing: '0.12em', marginTop: 2 }}>
                  your-sofer.com
                </div>
              </div>
              <span style={{ fontSize: 26, color: '#C5A028' }}>✡</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#1E3A8A', letterSpacing: '0.02em' }}>
              תעודת כשרות סת״מ
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4, letterSpacing: '0.08em' }}>
              Certificate of Kashrut — STaM Items
            </div>
          </div>

          {/* ── Customer ── */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 6px' }}>מאשרים בזאת כי</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: '#1E3A8A', margin: '0 0 6px' }}>
              {cert.customerName}
            </p>
            <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.6 }}>
              רכש את הפריטים המפורטים להלן, אשר נכתבו כדת וכדין ונבדקו ואושרו על פי ההלכה.
            </p>
          </div>

          {/* ── Items Table ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22, fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#1E3A8A', color: '#fff' }}>
                {['מס׳ סידורי', 'מוצר', 'סוג', 'רמת כשרות', 'שם הסופר'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cert.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fffdf8' : '#fff', borderBottom: '1px solid #e8e0d0' }}>
                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#1E3A8A', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {item.serialNumber}
                  </td>
                  <td style={{ padding: '7px 10px', maxWidth: 180 }}>{item.productName}</td>
                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{item.type}</td>
                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: '#15803d', fontWeight: 600 }}>{item.qualityLevel}</td>
                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{item.soferName}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Rabbinical Text ── */}
          <div style={{
            background: '#fffbf0',
            border: '1px solid rgba(184,151,42,0.4)',
            borderRadius: 8,
            padding: '13px 18px',
            marginBottom: 22,
          }}>
            <p style={{ fontSize: 12, lineHeight: 1.9, color: '#2d2100', textAlign: 'center', margin: 0 }}>
              כל הפריטים המפורטים לעיל נכתבו על ידי סופרי סת״מ ירא שמים שעברו בדיקה ואישור אישי על ידי Your Sofer,
              ונבדקו בקפדנות על ידי מגיה מוסמך. כל הפריטים כשרים <strong>לכתחילה</strong> לכל דיניהם ופרטיהם,
              בהתאם למנהגי אשכנז וספרד כאחד.
            </p>
          </div>

          {/* ── Magia + Date + Signature ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>המגיה המוסמך</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1E3A8A' }}>{cert.magiaName}</div>
              <div style={{ marginTop: 18, borderBottom: '1px solid #333', width: 160 }} />
              <div style={{ fontSize: 9, color: '#888', marginTop: 3 }}>חתימה ואישור</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 3 }}>תאריך הנפקה</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1E3A8A' }}>{dateStr}</div>
              <div style={{ marginTop: 6, fontSize: 10, color: '#888' }}>
                הזמנה: {cert.externalOrderId?.slice(-8)?.toUpperCase() ?? '-'}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            borderTop: '2px solid #C5A028',
            paddingTop: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#888', marginBottom: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                מספר תעודה / Certificate ID
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'monospace', color: '#1E3A8A', letterSpacing: '0.06em' }}>
                {cert.certId}
              </div>
              <div style={{ fontSize: 9, color: '#888', marginTop: 5, lineHeight: 1.5 }}>
                לאימות תעודה זו סרקו את קוד ה-QR<br />
                או בקרו בכתובת: your-sofer.com/verify/{cert.certId}
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: cert.valid ? '#15803d' : '#c0392b', fontWeight: 700, background: cert.valid ? '#f0fdf4' : '#fff4f4', border: `1px solid ${cert.valid ? '#86efac' : '#ffc0c0'}`, borderRadius: 4, padding: '2px 7px' }}>
                  {cert.valid ? '✓ תעודה תקפה' : '✗ תעודה לא תקפה'}
                </span>
              </div>
            </div>
            {/* QR Code */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <img
                src={qrUrl}
                alt={`QR code לאימות תעודה ${cert.certId}`}
                width={110}
                height={110}
                style={{ display: 'block', borderRadius: 4, border: '1px solid #e8e0d0' }}
              />
              <div style={{ fontSize: 8, color: '#aaa', marginTop: 4 }}>סרוק לאימות</div>
            </div>
          </div>

          {/* Watermark */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) rotate(-35deg)',
            fontSize: 90, fontWeight: 900, color: 'rgba(184,151,42,0.035)',
            pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
          }}>
            YOUR SOFER
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; background: white; }
          .no-print { display: none !important; }
          #certificate {
            width: 210mm !important;
            min-height: 297mm !important;
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
        .no-print { display: flex; }
        @media (max-width: 240mm) {
          #certificate { width: 100% !important; padding: 6mm 5mm !important; }
        }
      `}</style>
    </>
  );
}

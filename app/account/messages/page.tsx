'use client';

export default function MessagesPage() {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 300, color: '#1a1a1a', margin: '0 0 24px', letterSpacing: '-0.01em' }}>
        ההודעות שלי
      </h2>
      <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
        <div style={{ fontSize: 20, fontWeight: 300, color: '#1a1a1a', marginBottom: 8 }}>מרכז הודעות — בקרוב</div>
        <div style={{ fontSize: 14, color: '#9CA3AF', maxWidth: 360, margin: '0 auto', lineHeight: 1.8 }}>
          עדכוני הזמנות, חידושי מלאי, והודעות שירות — במקום אחד.
        </div>
        <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F8F6F1', padding: '10px 20px' }}>
          <span style={{ fontSize: 20 }}>🔜</span>
          <span style={{ fontSize: 13, color: '#555' }}>בקרוב</span>
        </div>
      </div>
    </div>
  );
}

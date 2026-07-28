'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', padding: '3rem 1rem' }}>
        <h2 style={{ fontWeight: 300, fontSize: '1.5rem', marginBottom: '1rem' }}>
          שגיאה בטעינת האתר
        </h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          אנא נסו לרענן את הדף.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 2rem',
            background: 'transparent',
            border: '1px solid #333',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          רענן
        </button>
      </body>
    </html>
  );
}

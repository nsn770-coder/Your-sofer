import { notFound } from 'next/navigation';
import lifeEvents from '@/data/lifeEvents';

export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = lifeEvents.find(e => e.id === id);
  if (!event) notFound();

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", maxWidth: 720, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#C5A028', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        רגע חיים
      </p>
      <h1 style={{ fontSize: 36, fontWeight: 300, color: '#1E3A8A', marginBottom: 16, lineHeight: 1.3 }}>
        {event.emotionalTitle}
      </h1>
      <p style={{ fontSize: 16, color: '#666', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 48px' }}>
        {event.description}
      </p>
      <p style={{ fontSize: 13, color: '#bbb' }}>
        דף זה בפיתוח — התוכן המלא יתווסף בקרוב
      </p>
    </div>
  );
}

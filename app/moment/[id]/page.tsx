import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import lifeEvents from '@/data/lifeEvents';
import MomentClient from './MomentClient';
import { fetchMomentProducts } from './fetchMomentProducts';

// Server-render the product list and cache it for MOMENT_REVALIDATE seconds.
// Products become a fixed cached copy shared across visitors, instead of a fresh
// client-side Firestore query on every visit.
export const revalidate = 600; // keep in sync with MOMENT_REVALIDATE

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const event = lifeEvents.find(e => e.id === id);
  if (!event) return {};
  return {
    title: `${event.title} | Your Sofer`,
    description: event.description,
  };
}

export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = lifeEvents.find(e => e.id === id);
  if (!event) notFound();

  // Fetch products server-side (cached). Passed to the client as initial data so
  // the grid renders immediately with no client-side Firestore round-trip.
  const initialProducts = await fetchMomentProducts(event);

  return (
    <div dir="rtl" style={{ fontFamily: "'Heebo', Arial, sans-serif", background: '#FBF8F3', minHeight: '100vh' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #FDF9F0 0%, #EEE5D0 100%)',
        borderBottom: '1px solid #EAE3D4',
        padding: 'clamp(24px, 4vw, 40px) 24px clamp(20px, 3vw, 32px)',
        textAlign: 'center',
      }}>

        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" style={{ fontSize: 12, color: '#A89880', marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <a href="/" style={{ color: '#A89880', textDecoration: 'none' }}>בית</a>
          <span aria-hidden>›</span>
          <span>רגעי חיים</span>
          <span aria-hidden>›</span>
          <span style={{ color: '#5A4F3E' }}>{event.title}</span>
        </nav>

        {/* Label */}
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9C7B3F', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 18 }}>
          רגע חיים
        </p>

        {/* Emotional title — visually dominant, intentionally NOT the h1 */}
        <p style={{
          fontSize: 'clamp(24px, 4vw, 38px)',
          fontWeight: 300,
          color: '#3A2E1A',
          lineHeight: 1.3,
          marginBottom: 12,
          maxWidth: 700,
          marginInline: 'auto',
        }}>
          {event.emotionalTitle}
        </p>

        {/* h1 = event.title — SEO anchor, styled as subtitle */}
        <h1 style={{ fontSize: 13, fontWeight: 700, color: '#9C7B3F', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 22 }}>
          {event.title}
        </h1>

        {/* Warm divider */}
        <div style={{ width: 32, height: 1, background: '#9C7B3F', margin: '0 auto 22px', opacity: 0.5 }} aria-hidden />

        {/* Description */}
        <p style={{
          fontSize: 17,
          color: '#6B5E4A',
          lineHeight: 1.95,
          maxWidth: 580,
          margin: '0 auto',
          fontStyle: 'italic',
        }}>
          {event.description}
        </p>
      </section>

      {/* ── Products (client) ─────────────────────────────────────────────────── */}
      <MomentClient event={event} initialProducts={initialProducts} />
    </div>
  );
}

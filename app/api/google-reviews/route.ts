import { NextResponse } from 'next/server';

// ביקורות גוגל של העסק — נשלף מ-Google Places API (New) עם קאש של 6 שעות.
// דורש env: GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID (ב-.env.local וב-Vercel).
export const revalidate = 21600;

// קישור ישיר לכתיבת ביקורת (סופק ע"י נסים) — עובד גם בלי Places API
const WRITE_REVIEW_URL = 'https://g.page/r/CaQlOx30alHMEAE/review';

interface GoogleReviewNew {
  rating: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  authorAttribution?: { displayName?: string; photoUri?: string };
}

// מזהה העסק — נמצא אוטומטית לפי שם אם GOOGLE_PLACE_ID לא מוגדר, ונשמר בזיכרון
let cachedPlaceId: string | null = null;

async function resolvePlaceId(key: string): Promise<string | null> {
  if (process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  if (cachedPlaceId) return cachedPlaceId;
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({ textQuery: 'Your Sofer יודאיקה', regionCode: 'IL' }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('[google-reviews] searchText', res.status, JSON.stringify(data.error || data).slice(0, 300));
      return null;
    }
    const id = data.places?.[0]?.id || null;
    if (id) {
      cachedPlaceId = id;
      console.log('[google-reviews] resolved place:', data.places[0]?.displayName?.text, id);
    }
    return id;
  } catch (e) {
    console.error('[google-reviews] searchText', e);
    return null;
  }
}

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, reviews: [], writeUrl: WRITE_REVIEW_URL });
  }
  const placeId = await resolvePlaceId(key);
  if (!placeId) {
    return NextResponse.json({ configured: false, reviews: [], writeUrl: WRITE_REVIEW_URL });
  }
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=he`,
      {
        headers: {
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri',
        },
        next: { revalidate: 21600 },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error('[google-reviews]', res.status, JSON.stringify(data.error || data).slice(0, 300));
      return NextResponse.json({ configured: false, reviews: [], writeUrl: WRITE_REVIEW_URL });
    }
    const reviews = ((data.reviews || []) as GoogleReviewNew[])
      .map(rv => ({
        author: rv.authorAttribution?.displayName || 'לקוח',
        avatar: rv.authorAttribution?.photoUri || '',
        rating: rv.rating,
        when: rv.relativePublishTimeDescription || '',
        text: rv.text?.text || rv.originalText?.text || '',
        time: rv.publishTime ? new Date(rv.publishTime).getTime() : 0,
      }))
      .filter(rv => rv.rating >= 4 && rv.text.trim().length > 0);
    return NextResponse.json(
      {
        configured: true,
        rating: data.rating ?? null,
        total: data.userRatingCount ?? 0,
        reviews,
        writeUrl: WRITE_REVIEW_URL,
        mapsUrl: data.googleMapsUri || '',
      },
      { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' } }
    );
  } catch (e) {
    console.error('[google-reviews]', e);
    return NextResponse.json({ configured: false, reviews: [], writeUrl: WRITE_REVIEW_URL });
  }
}

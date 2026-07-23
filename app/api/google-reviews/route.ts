import { NextResponse } from 'next/server';

// ביקורות גוגל של העסק — נשלף מ-Google Places API עם קאש של 6 שעות.
// דורש env: GOOGLE_PLACES_API_KEY + GOOGLE_PLACE_ID (ב-.env.local וב-Vercel).
export const revalidate = 21600;

// קישור ישיר לכתיבת ביקורת (סופק ע"י נסים) — עובד גם בלי Places API
const WRITE_REVIEW_URL = 'https://g.page/r/CaQlOx30alHMEAE/review';

interface GoogleReview {
  author_name: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description?: string;
  text?: string;
  time?: number;
}

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) {
    return NextResponse.json({ configured: false, reviews: [], writeUrl: WRITE_REVIEW_URL });
  }
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${encodeURIComponent(placeId)}` +
      `&fields=rating,user_ratings_total,reviews,url` +
      `&language=iw&reviews_sort=newest&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    const data = await res.json();
    if (data.status !== 'OK') {
      console.error('[google-reviews]', data.status, data.error_message);
      return NextResponse.json({ configured: false, reviews: [], writeUrl: WRITE_REVIEW_URL });
    }
    const r = data.result || {};
    const reviews = ((r.reviews || []) as GoogleReview[])
      .filter(rv => rv.rating >= 4 && (rv.text || '').trim().length > 0)
      .map(rv => ({
        author: rv.author_name,
        avatar: rv.profile_photo_url || '',
        rating: rv.rating,
        when: rv.relative_time_description || '',
        text: rv.text || '',
        time: rv.time || 0,
      }));
    return NextResponse.json(
      {
        configured: true,
        rating: r.rating ?? null,
        total: r.user_ratings_total ?? 0,
        reviews,
        writeUrl: WRITE_REVIEW_URL,
        mapsUrl: r.url || '',
      },
      { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' } }
    );
  } catch (e) {
    console.error('[google-reviews]', e);
    return NextResponse.json({ configured: false, reviews: [], writeUrl: WRITE_REVIEW_URL });
  }
}

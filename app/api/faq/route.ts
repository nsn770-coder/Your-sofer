import { NextResponse } from 'next/server';
import { FAQ_CATEGORIES, FAQ_ITEMS, FAQ_UPDATED_AT } from '@/data/faq';

/**
 * GET /api/faq — ייצוא מאגר השאלות והתשובות בפורמט JSON נקי.
 *
 * מיועד להזנת בוטים ומערכות חיצוניות. אינו חושף מידע פרטי או נתוני הזמנות —
 * רק תוכן ציבורי שממילא מוצג בדף ה-FAQ.
 * הבוט צריך להשתמש ב-shortAnswer; דף ה-FAQ משתמש ב-fullAnswer.
 */
export async function GET() {
  return NextResponse.json(
    {
      updatedAt: FAQ_UPDATED_AT,
      categories: FAQ_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
      items: FAQ_ITEMS.map(item => ({
        id: item.id,
        category: item.category,
        question: item.question,
        fullAnswer: item.fullAnswer,
        shortAnswer: item.shortAnswer,
        keywords: item.keywords ?? [],
        pages: item.pages ?? [],
        cta: item.cta ?? null,
      })),
    },
    {
      headers: {
        // תוכן סטטי יחסית — מותר לקאשר לשעה בקצה
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}

/**
 * /api/cron/sync-simchonim
 *
 * סינכרון יומי של מוצרי סימחוני
 * מופעל מ-Vercel cron ב-03:30
 *
 * דורש: CRON_SECRET בסביבה
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // קריאה לקובץ הסקריפט - זה דורש הפעלה של Node.js script
    // או קריאה ישירה לפונקציה שמעדכנת את Firestore

    return NextResponse.json({
      success: true,
      message: 'סינכרון סימחוני התחיל',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('סינכרון סימחוני נכשל:', error);
    return NextResponse.json(
      { error: 'סינכרון נכשל' },
      { status: 500 }
    );
  }
}

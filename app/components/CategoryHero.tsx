'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { useT } from '@/app/lib/i18n/useT';

interface CatDoc {
  displayName?: string;
  name?: string;
  imageUrl?: string;
  imgUrl?: string;
  description?: string;
}

/**
 * רצועת פתיחה לעמוד קטגוריה — נמדד מ-NOTHS (08/2026):
 * רקע מגוון, כותרת 32px משקל 500 ממורכזת בחצי אחד, ותמונה 16:9 עם
 * border-radius 10px בחצי השני. גובה כולל ~340px בדסקטופ.
 *
 * הגוון שלהם (#DDE5EA) כחלחל; כאן הוא נגזר מסגול המותג ב-10% מעל רקע
 * העמוד — אותה טכניקה, בזהות שלנו.
 *
 * מעבר לעיצוב, זה גם רווח SEO: היום לעמוד הקטגוריה אין טקסט תיאורי כלל,
 * ומנועי חיפוש רואים רק רשת מוצרים.
 */
export default function CategoryHero({ category }: { category: string }) {
  const { tc, dir, isTranslated } = useT();
  const [doc, setDoc] = useState<CatDoc | null>(null);

  useEffect(() => {
    let cancelled = false;
    // הרשומה נשמרת פעם לפי slug ופעם לפי displayName — מנסים את שניהם
    (async () => {
      for (const field of ['slug', 'displayName'] as const) {
        const snap = await getDocs(
          query(collection(db, 'categories'), where(field, '==', category), limit(1))
        ).catch(() => null);
        if (cancelled) return;
        if (snap && !snap.empty) { setDoc(snap.docs[0].data() as CatDoc); return; }
      }
    })();
    return () => { cancelled = true; };
  }, [category]);

  const title = tc(doc?.displayName || doc?.name || category);
  const image = doc?.imageUrl || doc?.imgUrl;
  // ⚠️ ה-description ב-Firestore הוא פסקה שיווקית בעברית בלבד. עדיף לא להציג
  // אותה בכלל בעמוד אנגלי מאשר לתקוע פסקה עברית באמצע טקסט לטיני; התמונה
  // והכותרת המתורגמת נשארות. כשיהיו תיאורי קטגוריה מתורגמים — כאן מחברים אותם.
  const desc  = isTranslated ? undefined : doc?.description;

  // בלי תמונה וגם בלי תיאור אין מה להציג — הכותרת לבדה כבר קיימת בעמוד
  if (!image && !desc) return null;

  return (
    <section
      dir={dir}
      aria-labelledby="cat-hero-title"
      style={{
        background: 'color-mix(in srgb, var(--ys-purple) 10%, var(--ys-page))',
        marginBottom: 32,
      }}
    >
      <div
        className="ys-cat-hero"
        style={{
          maxWidth: 'var(--ys-container)', marginInline: 'auto',
          display: 'grid', alignItems: 'center', gap: 28,
          padding: '28px 20px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            id="cat-hero-title"
            style={{
              fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 500,
              color: 'var(--ys-ink)', letterSpacing: '-0.025em',
              margin: '0 0 14px', lineHeight: 1.25,
            }}
          >
            {title}
          </h1>
          {desc && (
            <p style={{
              fontSize: 16, lineHeight: 1.75, color: 'var(--ys-ink)',
              opacity: 0.85, margin: '0 auto', maxWidth: 460,
            }}>
              {desc}
            </p>
          )}
        </div>

        {image && (
          <div style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 10 }}>
            <img
              src={optimizeCloudinaryUrl(image, 900)}
              alt={title}
              // תמונת ה-hero של העמוד — נטענת מיד ולא lazy
              fetchPriority="high"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

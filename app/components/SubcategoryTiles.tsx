'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';

interface Subcat {
  slug: string;
  displayName: string;
  imageUrl?: string;
  priority?: number;
  /** ערך ה-subCategory שאליו מסננים. ריק = נופלים ל-slug (רשומות ישנות) */
  filterValue?: string;
}

/**
 * אריחי תת-קטגוריה — נמדד מ-NOTHS (עמוד המחלקה שלהם, 08/2026):
 * תמונה ריבועית 1:1 עם פינות מעוגלות **בחלק העליון בלבד** (10px 10px 0 0),
 * ותווית 16px במשקל 600 צמודה מתחתיה. חמישה אריחים בשורה בדסקטופ.
 *
 * הרעיון: אחרי שהלקוח ראה שורת מוצרים ראשונה והבין מה יש כאן, מציעים לו
 * לצמצם — "כיפות קטיפה", "כיפות סרוגות" — בצורה ויזואלית ולא כרשימת צ'קבוקסים.
 * זה עובד הרבה יותר טוב מפילטר בסרגל הצד, כי הלקוח לא תמיד יודע איך
 * תת-הקטגוריה נקראת, אבל הוא מזהה אותה בתמונה.
 */
export default function SubcategoryTiles({ category, activeFilter, variant = 'full' }: {
  category: string;
  /** תת-הקטגוריה שכבר נבחרה — אם יש, לא מציגים את הרצועה */
  activeFilter?: string;
  /** 'compact' — החזרה השנייה בעמוד ארוך: בלי כותרת, אריחים קטנים יותר */
  variant?: 'full' | 'compact';
}) {
  const [subcats, setSubcats] = useState<Subcat[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, 'categories'), where('parentCategory', '==', category)))
      .then(snap => {
        if (cancelled) return;
        const list = snap.docs
          .map(d => d.data() as Subcat)
          // בלי תמונה האריח חסר משמעות — נופלים חזרה לפילטר בסרגל הצד
          .filter(s => s.slug && s.displayName && s.imageUrl)
          .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        setSubcats(list);
      })
      .catch(e => console.error('[SubcategoryTiles] load failed:', e));
    return () => { cancelled = true; };
  }, [category]);

  // כשכבר סוננה תת-קטגוריה, הרצועה רק מבלבלת
  if (activeFilter || subcats.length < 2) return null;

  return (
    <section
      dir="rtl"
      aria-labelledby="subcat-tiles-title"
      style={{ margin: '40px 0' }}
    >
      <h2
        id="subcat-tiles-title"
        className="ys-section-title"
        style={{ marginBottom: 20, ...(variant === 'compact' ? { fontSize: 18 } : {}) }}
      >
        {variant === 'compact' ? 'עדיין מחפשים? צמצמו לפי סוג' : 'לפי סוג'}
      </h2>

      <div
        className={variant === 'compact'
          ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
          : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}
        style={{ columnGap: 'var(--ys-col-gap)', rowGap: 28 }}
      >
        {subcats.map(s => (
          <a
            key={s.slug}
            href={`/category/${encodeURIComponent(category)}?filter=${encodeURIComponent(s.filterValue || s.slug)}`}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            {/* פינות מעוגלות למעלה בלבד — התווית יושבת צמוד מתחת ונקראת
                כהמשך של האריח ולא ככרטיס נפרד */}
            <div style={{
              width: '100%', aspectRatio: '1 / 1', overflow: 'hidden',
              borderRadius: '10px 10px 0 0', background: 'var(--ys-page)',
            }}>
              <img
                src={optimizeCloudinaryUrl(s.imageUrl!, 400)}
                alt={s.displayName}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <p style={{
              fontSize: 15, fontWeight: 600, color: 'var(--ys-ink)',
              margin: '10px 0 0', lineHeight: 1.4,
            }}>
              {s.displayName}
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

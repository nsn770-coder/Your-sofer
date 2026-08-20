'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { useT } from '@/app/lib/i18n/useT';

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
/*
 * ⚠️ תרגום: רק התווית הנראית עוברת ב-tc(). s.slug / s.filterValue הם ערכי
 * subCategory אמיתיים מ-Firestore והם נשלחים בפרמטר ?filter= — אסור לגעת בהם.
 * תת-קטגוריה שאין לה ערך ב-app/lib/i18n/categories.ts תוצג בעברית כמו שהיא.
 */
export default function SubcategoryTiles({ category, activeFilter, variant = 'full' }: {
  category: string;
  /** תת-הקטגוריה שכבר נבחרה — אם יש, לא מציגים את הרצועה */
  activeFilter?: string;
  /** 'compact' — החזרה השנייה בעמוד ארוך: בלי כותרת, אריחים קטנים יותר */
  variant?: 'full' | 'compact';
}) {
  const { t, tc, dir, href } = useT();
  const [subcats, setSubcats] = useState<Subcat[]>([]);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, 'categories'), where('parentCategory', '==', category)))
      .then(snap => {
        if (cancelled) return;
        const list = snap.docs
          .map(d => {
            const r = d.data() as Subcat & { name?: string; imgUrl?: string };
            // שדה slug קודם למזהה המסמך: המזהה הוא מחרוזת אקראית
            // (2OuGWdU07…) בעוד ה-slug מחזיק את הערך העברי שאליו מסננים.
            return {
              slug:        r.slug || d.id || '',
              displayName: r.displayName || r.name || '',
              imageUrl:    r.imageUrl || r.imgUrl || '',
              priority:    r.priority,
              filterValue: r.filterValue,
            } as Subcat;
          })
          // בלי תמונה האריח חסר משמעות — נופלים חזרה לפילטר בסרגל הצד
          .filter(s => s.displayName && s.imageUrl)
          .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        setSubcats(list);
      })
      .catch(e => console.error('[SubcategoryTiles] load failed:', e));
    return () => { cancelled = true; };
  }, [category]);

  if (subcats.length < 2) return null;

  // כשתת-קטגוריה כבר נבחרה, הרצועה משנה תפקיד: מ"צמצמו" ל"עברו בין סוגים".
  // האריח הפעיל מסומן, ונוספת כניסה שמחזירה לכל הקטגוריה.
  const isFiltered = !!activeFilter;
  const heading = isFiltered
    ? t('subcat.switch')
    : variant === 'compact' ? t('subcat.narrow') : t('subcat.byType');

  return (
    <section
      dir={dir}
      aria-labelledby="subcat-tiles-title"
      style={{ margin: '40px 0' }}
    >
      <h2
        id="subcat-tiles-title"
        className="ys-section-title"
        style={{ marginBottom: 20, ...(variant === 'compact' ? { fontSize: 18 } : {}) }}
      >
        {heading}
      </h2>

      <div
        className={variant === 'compact'
          ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
          : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'}
        style={{ columnGap: 'var(--ys-col-gap)', rowGap: 28 }}
      >
        {isFiltered && (
          /* חזרה לכל הקטגוריה — בלי זה אפשר להיכנס לתת-קטגוריה ולא לצאת
             ממנה בלי סרגל הסינון */
          <a
            href={href(`/category/${encodeURIComponent(category)}`)}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div style={{
              width: '100%', aspectRatio: '1 / 1',
              borderRadius: '10px 10px 0 0',
              background: 'color-mix(in srgb, var(--ys-purple) 10%, var(--ys-page))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ys-purple)', fontSize: 26, fontWeight: 300,
            }}>
              ⌂
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ys-ink)', margin: '10px 0 0', lineHeight: 1.4 }}>
              {t('subcat.all').replace('{x}', tc(category))}
            </p>
          </a>
        )}
        {subcats.map(s => {
          const value = s.filterValue || s.slug;
          const active = isFiltered && value === activeFilter;
          return (
          <a
            key={s.slug}
            href={href(`/category/${encodeURIComponent(category)}?filter=${encodeURIComponent(value)}`)}
            aria-current={active ? 'true' : undefined}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            {/* פינות מעוגלות למעלה בלבד — התווית יושבת צמוד מתחת ונקראת
                כהמשך של האריח ולא ככרטיס נפרד */}
            <div style={{
              width: '100%', aspectRatio: '1 / 1', overflow: 'hidden',
              borderRadius: '10px 10px 0 0', background: 'var(--ys-page)',
              // הסוג הנוכחי מסומן במסגרת, כדי שיהיה ברור איפה אתה עומד
              outline: active ? '2px solid var(--ys-purple)' : 'none',
              outlineOffset: -2,
              opacity: active ? 1 : undefined,
            }}>
              <img
                src={optimizeCloudinaryUrl(s.imageUrl!, 400)}
                alt={tc(s.displayName)}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <p style={{
              fontSize: 15, fontWeight: active ? 700 : 600,
              color: active ? 'var(--ys-purple)' : 'var(--ys-ink)',
              margin: '10px 0 0', lineHeight: 1.4,
            }}>
              {tc(s.displayName)}
            </p>
          </a>
          );
        })}
      </div>
    </section>
  );
}

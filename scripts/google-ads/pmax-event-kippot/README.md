# PMax | כיפות לאירועים | Event Kippot

תשתית ליצירת קמפיין Google Ads Performance Max ייעודי **אך ורק** למוצרי הכיפות
לאירועים של Your Sofer.

---

## 1. מה נבנה

| רכיב | מה הוא עושה |
|---|---|
| `config.mjs` | כל ההגדרות: שם קמפיין, Search Themes, טקסטים, מיקום, שפה, החרגות. אין בו סודות. |
| `lib.mjs` | טעינת `.env.local`, חיבור Firestore, חיבור Google Ads, וההגדרה היחידה של `isEventKippah()`. |
| `check-account.mjs` | ביקורת **קריאה בלבד** של חשבון Google Ads: Conversion Actions, Merchant Center, קמפיינים קיימים. |
| `discover-products.mjs` | מפיק מ-Firestore את רשימת המוצרים שבפילטר "כיפות לאירועים". קריאה בלבד. |
| `collect-assets.mjs` | בוחר תמונות **רק ממוצרי כיפות לאירועים** וחותך אותן ליחסים ש-PMax דורש. |
| `validate-merchant-products.mjs` | משווה אתר ↔ פיד ↔ מרצ'נט. עוצר ב-ERROR אם יש מוצר מיותר. |
| `create-pmax-campaign.mjs` | יוצר את הקמפיין. **ברירת מחדל: dry-run. תמיד PAUSED.** |
| `verify-campaign.mjs` | אחרי היצירה — מוכיח אילו מוצרים באמת משויכים לקמפיין. |

בנוסף שונה קובץ אחד באתר: `app/api/google-feed/route.ts` — נוסף לו
`custom_label_1`.

---

## 2. איך נקבע אילו מוצרים נכנסים

מקור האמת הוא **הפילטר באתר**:

```
https://your-sofer.com/category/כיפות?filter=כיפות לאירועים
```

הפילטר הזה אינו שאילתת `subCategory` רגילה. "כיפות לאירועים" היא **תת-קטגוריה
וירטואלית** שמחושבת בקוד ב-`app/category/[category]/CategoryClient.tsx`
בפונקציה `isEventKippah()`:

```
מוצר נכלל אם:
  cat === "כיפות"
  AND hidden !== true
  AND (
        subCategory === "כיפות לאירועים"
        OR ( אין eventScrollSection
             AND ( isEventKippot === true
                OR isEventProduct === true
                OR eventsOnly     === true ) )
      )
```

- `eventScrollSection` מסמן מזכרות בעמוד `/event-kippot` (מטפחות, ברכונים,
  נרות הבדלה) — **אלה לא כיפות ולכן מוחרגים.**
- הלוגיקה הזו משוכפלת בשלושה מקומות שחייבים להישאר מסונכרנים:
  `CategoryClient.tsx`, `scripts/tagEventKippotSubcategory.mjs`,
  ו-`app/api/google-feed/route.ts` + `lib.mjs` כאן.

מזהה המוצר במרצ'נט (`g:id` / Offer ID / Item ID) הוא **מזהה המסמך ב-Firestore**
— ראה `app/api/google-feed/route.ts`. לכן אין צורך במיפוי בין האתר למרצ'נט.

---

## 3. איזה Custom Label נבחר

**`custom_label_1 = event_kippot`**

למה לא `custom_label_0`: הוא כבר בשימוש בפיד ונושא את שדה `badge` של המוצר
(`<g:custom_label_0>{badge}</g:custom_label_0>`). לפי ההנחיה לא דרסנו אותו.

`custom_label_2/3/4` נשארו פנויים לשימושים עתידיים.

למה לא `product_type`: הפיד שולח `product_type = cat`, כלומר `כיפות` לכל 795
מוצרי הכיפות — כולל כיפות סרוגות ליום-יום. זה לא תואם 100% לפילטר ולכן לא שימש.

---

## 4. איך המוצרים מסוננים בקמפיין

`AssetGroupListingGroupFilter` בשלושה צמתים:

```
ROOT  (SUBDIVISION, listing_source = SHOPPING)
 ├─ UNIT_INCLUDED   custom_label_1 == "event_kippot"
 └─ UNIT_EXCLUDED   custom_label_1 == "אחר"   ← כל שאר הקטלוג
```

הענף `UNIT_EXCLUDED` הוא ה"אחר" (case_value בלי `value`) והוא חוסם את כל
6,000+ המוצרים האחרים. לא ניתן למוצר בלי התווית להיכנס לקמפיין.

בנוסף:
- **Final URL Expansion כבוי.** מ-Google Ads API v22 השדה
  `campaign.url_expansion_opt_out` הוסר; השליטה עברה ל-
  `asset_automation_settings` עם `FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION =
  OPTED_OUT`. זה מה שהסקריפט מגדיר.
- **החרגות URL** נוספות ב-`campaign_criterion` מסוג `webpage` שלילי, לכל
  הקטגוריות האחרות באתר (תפילין, מזוזות, טליתות, יודאיקה וכו').

---

## 5. איך מריצים dry-run

```bash
# פעם אחת: התקנת ספריית Google Ads
npm i google-ads-api

# 1. ביקורת חשבון (קריאה בלבד) — כאן מוצאים את Merchant Center ID
node scripts/google-ads/pmax-event-kippot/check-account.mjs

# 2. הפקת רשימת המוצרים מהאתר
node scripts/google-ads/pmax-event-kippot/discover-products.mjs --csv

# 3. איסוף תמונות מהמוצרים האלה בלבד
node scripts/google-ads/pmax-event-kippot/collect-assets.mjs

# 4. אימות אתר ↔ פיד ↔ מרצ'נט
node scripts/google-ads/pmax-event-kippot/validate-merchant-products.mjs

# 5. dry-run — Google מאמת את כל הפעולות ולא יוצר כלום
node scripts/google-ads/pmax-event-kippot/create-pmax-campaign.mjs
```

ה-dry-run משתמש ב-`validate_only=true` של Google Ads API: השרת בודק את כל
הפעולות ומחזיר שגיאות אמיתיות, בלי ליצור שום ישות.

> שלב 4 יעבוד רק **אחרי** שה-deploy של `app/api/google-feed/route.ts` עלה
> לאוויר. לפני כן `custom_label_1` פשוט לא קיים בפיד.

---

## 6. איך יוצרים את הקמפיין

```bash
node scripts/google-ads/pmax-event-kippot/create-pmax-campaign.mjs --create
```

מה קורה:
1. מריץ אוטומטית את `validate-merchant-products.mjs` ועוצר אם יש מוצר מיותר.
2. בודק שאין כבר קמפיין באותו שם (לא דורס כלום).
3. יוצר תקציב ייעודי + קמפיין **PAUSED** + Asset Group + Listing Group.
4. מוסיף החרגות URL ב-mutate נפרד (כישלון שם לא הורס את הקמפיין).
5. שומר `out/created-campaign.json`.

דגלים:

| דגל | משמעות |
|---|---|
| `--dry-run` | ברירת המחדל. מיותר לציין. |
| `--create` | יצירה בפועל. חובה לציין במפורש. |
| `--skip-url-exclusions` | בלי החרגות עמודי נחיתה |
| `--with-negatives` | להוסיף גם את מילות המפתח השליליות מ-`SUGGESTED_NEGATIVES` |
| `--skip-validation` | לדלג על אימות המוצרים (לא מומלץ) |

אחרי היצירה:

```bash
node scripts/google-ads/pmax-event-kippot/verify-campaign.mjs
```

---

## 7. איך מפעילים אותו בעתיד

**אין דגל שמפעיל את הקמפיין.** זה מכוון.
ההפעלה נעשית ידנית בממשק Google Ads אחרי בדיקה:

`Campaigns → PMax | כיפות לאירועים | Event Kippot → Status → Enabled`

לפני ההפעלה כדאי לוודא:
- `verify-campaign.mjs` מחזיר `EXTRA PRODUCTS = 0`
- ה-Asset Group מאושר (Ad strength ≥ Good)
- ה-Conversion Action של רכישה פעיל, primary, ושולח ערך ב-ILS

---

## 8. משתני סביבה נדרשים

ראה `.env.example`. הערכים נכנסים ל-`.env.local` (שנמצא ב-`.gitignore`) —
**לא לקוד ולא לגיט**.

| משתנה | תיאור |
|---|---|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Developer token מה-MCC |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | OAuth desktop client |
| `GOOGLE_ADS_REFRESH_TOKEN` | scope `https://www.googleapis.com/auth/adwords` |
| `GOOGLE_ADS_CUSTOMER_ID` | חשבון המודעות |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | ה-MCC המנהל (אופציונלי) |
| `GOOGLE_MERCHANT_ID` | חשבון המרצ'נט המקושר |
| `GOOGLE_MERCHANT_FEED_LABEL` | אופציונלי |
| `DAILY_BUDGET_ILS` | תקציב יומי בשקלים |
| `TARGET_ROAS` | יעד ROAS כיחס (2.5 = 250%). ריק = בלי יעד |
| `FIREBASE_*` | כבר קיימים בפרויקט |

---

## 9. איך משנים תקציב

התקציב לא כתוב בקוד. שנה ב-`.env.local`:

```
DAILY_BUDGET_ILS=80
```

הסקריפט **לא** מעדכן קמפיין קיים. לשינוי תקציב של קמפיין שכבר נוצר — עשה זאת
בממשק Google Ads, או צור קמפיין חדש בשם אחר.

---

## 10. איך מגדירים Target ROAS

```
TARGET_ROAS=3.0     # 300%
```

השאר ריק כדי ליצור **Maximize Conversion Value ללא יעד ROAS**.

ההמלצה: להתחיל בלי יעד, לתת לקמפיין 2–3 שבועות ו-30+ המרות, ורק אז להוסיף
יעד לפי ה-ROAS שהתקבל בפועל (בערך 80–90% ממנו, לא יותר).

---

## 11. איך בודקים שהקמפיין לא מפרסם מוצרים אחרים

שלוש בדיקות בלתי תלויות:

```bash
# א. בפיד — כמה פריטים נושאים את התווית
curl -s "https://your-sofer.com/api/google-feed?diag=1" | grep eventKippotLabeled

# ב. אתר ↔ פיד ↔ מרצ'נט
node scripts/google-ads/pmax-event-kippot/validate-merchant-products.mjs

# ג. מה באמת משויך לקמפיין ב-Google Ads
node scripts/google-ads/pmax-event-kippot/verify-campaign.mjs
```

היעד בכל השלוש: **`EXTRA PRODUCTS = 0`**.
`verify-campaign.mjs` יוצא עם קוד 1 אם נמצא מוצר מיותר, כדי שאפשר יהיה לשרשר
אותו ל-CI או ל-pre-flight לפני הפעלה.

בנוסף, בממשק Google Ads:
`Campaign → Asset groups → Listing groups` — צריך להיראות צומת אחד
`custom_label_1 = event_kippot` בלבד, וכל השאר `Excluded`.

---

## 12. מה הסקריפטים **לא** עושים

- לא נוגעים בשום קמפיין קיים, לא משנים, לא משהים ולא מוחקים.
- לא משנים Conversion Actions.
- לא מוציאים מוצרים מקמפיינים קיימים.
- לא מפעילים קמפיין (אין `--enable`).
- לא כותבים ל-Firestore.
- לא מדפיסים tokens, secrets, developer token או סיסמאות.

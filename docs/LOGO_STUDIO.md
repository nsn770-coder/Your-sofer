# סטודיו לוגו אישי לכיפה — `/logo-studio`

## מה זה
הלקוח בוחר כיפה, מזין את פרטי הלוגו, יוצר לוגו, מתקן אותו בשיחה, רואה הדמיה על הכיפה שבחר, מאשר ומוסיף לסל.

## ארכיטקטורה בקצרה
| שכבה | קבצים |
|------|-------|
| נתונים מובנים (LogoSpec), אימות קלט | `lib/logoStudio/types.ts` |
| גופנים (OFL, עברית ואנגלית) | `lib/logoStudio/fonts.ts`, `public/fonts/logo-studio/*.ttf` |
| טקסט מדויק → קווי מתאר וקטוריים (opentype.js) + bidi | `textRender.server.ts`, `bidi.ts` |
| הרכבת הלוגו → PNG שקוף (sharp) | `compose.server.ts`, `symbols.ts` |
| שכבות AI (עיטור, מונוגרמה) — קו שחור על לבן → שקיפות וצבע מדויק | `aiLayers.server.ts`, `gemini.server.ts` |
| שיחת תיקונים → שינוי מובנה | `interpret.server.ts` |
| הדמיה: הלבשה מבוקרת על תמונת הווריאציה | `mockup.server.ts`, `catalog.ts`, `fetchImage.server.ts` |
| מכסה אטומית, קודים, הגבלת קצב | `quota.server.ts`, `codes.server.ts`, `rateLimit.server.ts` |
| אחסון פרטי (Cloudinary authenticated + URL חתום) | `storage.server.ts` |
| API לקוח | `app/api/logo-studio/**` |
| API אדמין | `app/api/admin/logo-studio/**` |
| ממשק לקוח | `app/logo-studio/**` |
| ממשק אדמין | `app/admin/logo-studio/page.tsx`, `app/admin/components/LogoStudioOrderPanel.tsx` |

## אוספי Firestore חדשים (Admin SDK בלבד, הלקוח חסום ב-rules)
`logoProjects` (+ `versions`, `mockups`, `messages`), `logoApprovals`, `logoStudioUsers` (+ `ledger`), `logoStudioOps`, `logoStudioCodes` (+ `redemptions`), `logoStudioRate`, `logoStudioAssets`, `settings/logoStudio`.
במוצר נוסף השדה האופציונלי `logoStudio` (תמונות וריאציה, אזור הדפסה, רוחב במ״מ, גימורים).

## משתני סביבה
- `GEMINI_API_KEY` — קיים. משמש לעיטור, למונוגרמה ולשיחה. בלעדיו, סגנונות טקסט עובדים והשיחה עוברת לחוקים מקומיים.
- `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — **חובה** (העלאה חתומה של קבצים פרטיים).
- `LOGO_STUDIO_CODE_SECRET` — מומלץ (32+ תווים אקראיים). בלעדיו נגזר סוד מ-`FIREBASE_PRIVATE_KEY`.
- אופציונלי: `LOGO_STUDIO_IMAGE_MODELS`, `LOGO_STUDIO_TEXT_MODELS` (רשימות מודלים מופרדות בפסיק).

## הרצה ובדיקה מקומית
```bash
npm install          # נוספו opentype.js, sharp (מפורש), @types/opentype.js
npm test             # כולל 54 בדיקות של הסטודיו
npm run typecheck
npm run dev          # http://localhost:3000/logo-studio
```
1. באדמין ← „סטודיו לוגו וקודים” ← „כיפות והדמיה”: שייכו תמונה לכל צבע/בד והגדירו רוחב הדפסה במ״מ.
2. כנסו לעמוד מוצר של כיפה עם `customDesign`/`isEventKippot` ← „עצבו לוגו אישי לכיפה”.
3. בדקו: יצירה (ניסיון 1), תיקון בשיחה, חזרה לגרסה קודמת, הדמיה, אישור ← סל ← הזמנה ← פאנל הלוגו בהזמנה באדמין.
4. אחרי 3 יצירות: הודעת החסימה ← צרו קוד באדמין ← מימוש ← יצירה נוספת.

## פריסה
לפני פריסה: `firebase deploy --only firestore:rules` (חוקים חדשים לאוספים), והוספת משתני הסביבה ב-Vercel.

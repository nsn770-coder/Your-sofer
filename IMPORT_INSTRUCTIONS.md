# הוראות ייבוא מוצרים חדשים מ-israel-judaica

## קבצים שנוצרו
1. **`scripts/importNewProductsWithPrices.mjs`** — סקריפט ייבוא הראשי
2. **`scripts/supplier-prices.json`** — מפת SKU → מחיר מהספק (197 מוצרים)

## נוסחת הגדלת מחיר

- **כיפות** (`cat='כיפות'`): מחיר_ספק × **3**
- **כל המוצרים האחרים**: מחיר_ספק × **2.18**

## כיצד להריץ

### 1. Test mode (5 מוצרים בלבד - אין כתיבה ל-Firestore)
```bash
node scripts/importNewProductsWithPrices.mjs --test
```

תראה משהו כזה:
```
✓ Loaded 197 supplier prices

🧪 TEST MODE — 5 products
Found ... existing products in Firestore.

[1/5] ✅ WOULD CREATE:
     SKU: UK30023
     Name: מחזיק מפתחות "מנורה"...
     Supplier: ₪6.99 → Retail: ₪20.97 [יודאיקה]
```

### 2. Full import (כל המוצרים החדשים)
```bash
node scripts/importNewProductsWithPrices.mjs
```

## מה קורה בסקריפט

1. ✓ טוען 197 מחירי ספק מ-`supplier-prices.json`
2. ✓ קורא את כל מוצרי israel-judaica מ-`israel-judaica-products.json`
3. ✓ בודק אם SKU כבר קיים ב-Firestore (דילוג על קיימים)
4. ✓ בודק אם יש מחיר ספק (דילוג על חסרים)
5. ✓ מחשב מחיר קמעונאי לפי קטגוריה
6. ✓ מעלה ל-Firestore עם:
   - שם עברי
   - SKU
   - קטגוריה וקטגוריה-משנה
   - מחיר קמעונאי
   - מחיר בסיס ספק (לרeferense)
   - תמונה מURL
   - source: 'israel-judaica'
   - status: 'active'

## סטטוס

✅ 197 SKUs with prices loaded
✅ Scripts created and tested (syntax only)
⏳ Ready for full import — run on your machine with Firebase access

## שאלות?
אם יש בעיות:
1. בדוק שהקובץ `your-sofer-firebase-adminsdk-fbsvc-418544c2de.json` קיים
2. בדוק חיבור אינטרנט להתחברות ל-Firebase
3. תראה את הפלט של test mode כדי לנסות את ההגיון

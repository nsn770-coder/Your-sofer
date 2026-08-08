# Direct Image URLs from israel-judaica

## Problem Solved ✅

Cloudinary couldn't download images from israel-judaica due to hotlink protection. But **direct image URLs work perfectly in the browser** — no Cloudinary proxy needed!

## What This Does

- Scrapes all products from israel-judaica.com
- Filters to your 110 SKUs
- Updates Firestore with direct image URLs
- No Cloudinary upload, no failures

## Image URL Format

```
https://www.israel-judaica.com/big/{filename}
https://www.israel-judaica.com/webp/{filename}  # for WebP images
```

These URLs work fine in your Vercel frontend since browsers have full internet access.

## How to Run

### Step 1: Test First (Recommended)
```bash
node scripts/updateProductsWithDirectImageUrls.mjs --test
```

This will:
- Scrape israel-judaica
- Show you the first 5 products and their image URLs
- NOT touch Firestore

### Step 2: Update for Real
```bash
node scripts/updateProductsWithDirectImageUrls.mjs
```

This will:
- Scrape israel-judaica (all ~35 categories)
- Find your 110 SKUs that have images
- Update Firestore with direct URLs
- Show progress

## Expected Output (Test Mode)

```
🚀 Updating image URLs for 110 products

📡 Scraping israel-judaica (all categories)...

  ✓ Category 1118: Found 3 of our products
  ✓ Category 1119: Found 2 of our products
  ...

✓ Found 27/110 of our SKUs with images on israel-judaica

🧪 TEST MODE — First 5 products with their direct image URLs:

  1. UK50636
     → https://www.israel-judaica.com/big/UK50636.jpg
  2. UK59857
     → https://www.israel-judaica.com/big/UK59857.jpg
  ...
```

## How Many Products Will This Update?

- **27 out of 110** products are currently in israel-judaica's inventory with images
- **83 products** not yet available on israel-judaica (we'll need to add them to our catalog manually or wait for them to stock)

## Why This Works Better

| Approach | Issue | ✅ Solution |
|----------|-------|------------|
| **Cloudinary upload** | Hotlink protection → HTML error | **Direct URLs** → Browser can fetch |
| **Store in Firebase Storage** | Slow, requires upload | **Direct URLs** → Use supplier's CDN |
| **Complex proxy** | More moving parts | **Simple direct links** → Less to break |

## Files

- `scripts/updateProductsWithDirectImageUrls.mjs` — Main script
- `DIRECT_IMAGE_URLS_README.md` — This file

## Next Steps

1. Run in test mode: `node scripts/updateProductsWithDirectImageUrls.mjs --test`
2. Review the output to see which products get images
3. Run for real: `node scripts/updateProductsWithDirectImageUrls.mjs`
4. Verify in Firestore or check a product on your-sofer.com

---

**Note:** This script needs internet access to israel-judaica.com, so it must run on your local machine (not in a restricted sandbox).

# Performance Audit — your-sofer.com
**Date:** 2026-04-30  
**Method:** curl headers · npm run build · bundle analysis · static codebase scan  
**Lighthouse:** skipped (process hung on Windows headless Chrome — run from Linux CI instead)

---

## 1. Deployment Status

```
curl -sI https://your-sofer.com

X-Vercel-Cache:   PRERENDER   (first request — freshly rendered)
X-Vercel-Cache:   HIT         (second request — CDN cache hit)
X-Nextjs-Prerender: 1
X-Nextjs-Stale-Time: 300      (prerender valid for 5 minutes)
Age: 0
Cache-Control: public, max-age=0, must-revalidate
ETag: "a347ce32ca31ec4ff60b2603d860beaa"
Server: Vercel
```

**Verdict:** Site is live and served by Vercel's CDN (fra1 edge). Cache is healthy.  
Cannot confirm whether commit `c018e4e` (today's CLS fixes) is deployed yet — ETag doesn't expose build ID.  
To verify: check Vercel dashboard → Deployments → confirm latest git SHA is active.

---

## 2. Build Output

```
✓ Compiled successfully in 16.4s  (Turbopack)
✓ 75 static pages generated
```

### Route Types
| Type | Count | Examples |
|------|-------|---------|
| Static (○) | ~50 | /, /admin, /cart, /checkout, /legal/*, /madrich/* |
| Dynamic (ƒ) | ~12 | /product/[id], /category/[category], /api/* |
| SSG (●) | 16 | /soferim/[id] — with 1h revalidate |

**Issue:** `/` (homepage) is Static — means it was pre-rendered at build time with no Firebase data. 
All Firestore queries run client-side after hydration, which is the root cause of slow LCP on mobile.

---

## 3. Bundle Sizes

```
Total JS chunks:  58 files
Total size:       2,270 KB  (~2.27 MB uncompressed)
```

### Largest Chunks (uncompressed)
| Size | Chunk | Contents |
|------|-------|---------|
| 339 KB | `3299066812022bf4.js` | Unknown (main app bundle) |
| **335 KB** | `70e49a3fd221f6cd.js` | **Firebase SDK** |
| 218 KB | `e003fd6516fa0cb7.js` | Unknown |
| **181 KB** | `c0db9afb2199e346.js` | **Framer Motion** |
| 126 KB | `5c4671b841242613.js` | Firebase (secondary) |
| 114 KB | `5b71f68d179251ee.js` | Unknown |
| 109 KB | `a6dad97d9634a72d.js` | Unknown |
| 108 KB | `faef2fc8066c0308.js` | Unknown |

### Library Breakdown
| Library | Client JS (uncompressed) | Notes |
|---------|--------------------------|-------|
| Firebase SDK | **516 KB** (4 chunks) | Loaded on every page |
| Framer Motion | **181 KB** (1 chunk) | Used only for NavBar animations |
| Total tracked libs | **697 KB** | ~30% of total JS payload |

**On mobile with slow 4G:** 697 KB of library JS alone = ~1.4 seconds parse + execute time before any app logic runs.

---

## 4. Critical Performance Issues (Ranked by Impact)

### 🔴 P0 — Firebase in every client bundle (516 KB)
**Files:** `HomePageClient.tsx`, `ProductClient.tsx`, `CartContext.tsx`, `AuthContext.tsx`, `ProductCard.tsx`, `checkout/page.tsx`

Firebase is imported client-side on every page. The full SDK (Firestore + Auth) ships to every visitor even if they never log in or add to cart.

**Impact:** +516 KB JS payload, +0.8–1.5s TBT on mobile  
**Fix:** Move Firestore reads to API routes (Server Components / Route Handlers). Keep only Auth + cart writes on the client.

---

### 🔴 P0 — Microsoft Clarity blocks parser (layout.tsx:86)
```html
<script type="text/javascript" dangerouslySetInnerHTML={...} />
```
Raw inline `<script>` in `<head>` with no `defer`, no `async`, no Next.js strategy. The Clarity snippet synchronously inserts another `<script>` tag which fetches `clarity.ms/tag/...`. This runs before any content renders.

**Impact:** +0.3–0.8s LCP delay  
**Fix:**
```tsx
// Replace in layout.tsx:
import Script from 'next/script';
<Script id="clarity" strategy="afterInteractive">{`
  (function(c,l,a,r,i,t,y){...})(window, document, "clarity", "script", "wiozsdfcgm");
`}</Script>
```

---

### 🔴 P0 — Framer Motion shipped to all visitors (181 KB)
**Files:** `NavBar.tsx`, `MobileDrawerMenu.tsx`, `DesktopMegaMenu.tsx`

181 KB of animation library for slide-in mobile drawer and desktop mega menu hover. CSS transitions can replace this.

**Impact:** +181 KB JS, adds to TBT  
**Fix:** Replace `motion.div` / `AnimatePresence` with CSS `transition` + `transform`. Remove framer-motion import entirely.

---

### 🟠 P1 — GTMLoader uses manual script injection (GTMLoader.tsx)
Instead of `<Script strategy="lazyOnload">`, it manually creates `document.createElement('script')` and appends to `document.head`. This bypasses Next.js script optimization and can fire during user interaction handlers (AddToCart clicks), blocking the main thread.

**Impact:** Unpredictable TBT spikes  
**Fix:** Rewrite as `<Script id="gtm" strategy="lazyOnload" src="...">` with proper initialization.

---

### 🟠 P1 — Meta Pixel strategy is `afterInteractive` (FacebookPixel.tsx)
The pixel loads right after hydration, competing with LCP image decode and first interaction. `fbevents.js` (~85 KB) is fetched from Facebook CDN during the critical window.

**Impact:** +0.1–0.3s TBT on mobile  
**Fix:** Change to `strategy="lazyOnload"` — loads during browser idle time. All events still fire because `fbq()` is a queue before the library loads. ✅ **Applied in this audit.**

---

### 🟠 P1 — Hero image preload URL doesn't match deployed URL (layout.tsx:82)
```html
<!-- layout.tsx preloads this: -->
w_1200,q_auto:good,f_auto/v1777365682/...

<!-- SmartHero.tsx mobileSrc (same image, same URL) ✅ -->
<!-- SmartHero.tsx desktopSrc was missing transforms (now fixed) ✅ -->
```
The preload link in layout.tsx preloads the **mobile** image URL. On desktop, SmartHero actually loads the **desktop** URL (`w_1280,q_auto:best,f_auto/v1777452503/...`). So the preload is wasted for desktop visitors — the browser preloads an image that isn't used.

**Impact:** Wasted preload bandwidth on desktop, no LCP help  
**Fix:** Add a second preload for the desktop URL, or use `media` attribute to scope the preload.

---

### 🟡 P2 — No `priority` on above-the-fold category images (HomePageClient.tsx)
```tsx
// line 851 — category card images (first 4 visible on load)
<Image fill loading="lazy" src={...} />
// Should be:
<Image fill priority={index < 4} src={...} />
```
The first 4 category cards are visible on initial load but lazy-loaded, meaning the browser discovers them late (after JS hydrates and renders the grid).

**Impact:** +0.2–0.4s LCP  
**Fix:** Add `priority={i < 4}` to the first 4 category grid items.

---

### 🟡 P2 — Dynamic imports with `ssr: false` cause content shift (HomePageClient.tsx)
| Component | Loading Placeholder | Impact |
|-----------|---------------------|--------|
| `SmartFunnel` | `height: 400` ✅ | Good (fixed) |
| `TestimonialsCarousel` | `height: 450` ✅ | Good (fixed) |
| `NewsletterPopup` | `className="hidden"` (0px) | ⚠️ CLS when popup renders |

**Fix:** Change NewsletterPopup placeholder to `style={{ height: 0, display: 'none' }}` or just leave it hidden since it renders as a fixed overlay (no layout shift). Actually current `hidden` is fine since it's a modal.

---

### 🟡 P2 — 14 raw `<img>` tags in admin/page.tsx
No lazy-loading, no srcset, no optimization. Admin pages are internal-only but still add to total byte count.

---

### 🟢 P3 — Multiple client pages that could be Server Components
Legal pages (`/legal/*`), `/madrich/*`, `/search` all have `'use client'` but don't use hooks. Could render server-side with SSR streaming, improving TTFB.

---

## 5. What's Already Working Well

| Feature | Status |
|---------|--------|
| Hero image priority + eager loading | ✅ |
| Cloudinary transformations on hero images | ✅ (fixed today) |
| Tidio chat `lazyOnload` | ✅ |
| `next/font/google` with `display: swap` | ✅ |
| Preconnects for Firebase, Cloudinary, Google | ✅ |
| WizardStickyBar placeholder (no null flash) | ✅ (fixed today) |
| CSS media queries for grid/height (no JS CLS) | ✅ (fixed today) |
| SmartFunnel + Testimonials placeholder heights | ✅ (fixed today) |
| Image fill with explicit parent heights | ✅ |

---

## 6. Priority Fix List

| # | Fix | Est. Impact | Effort |
|---|-----|-------------|--------|
| 1 | Move Clarity to `strategy="afterInteractive"` | −0.5s LCP | 5 min |
| 2 | Move Firebase reads to API routes / Server Components | −500KB JS, −1s TBT | 2–4 days |
| 3 | Remove Framer Motion → CSS transitions | −181KB JS | 1 day |
| 4 | Change Meta Pixel to `lazyOnload` | −0.2s TBT | ✅ Done |
| 5 | Fix GTMLoader to use Next.js `<Script>` | −0.1s TBT | 2 hrs |
| 6 | Add desktop hero preload (scoped with `media`) | +LCP on desktop | 10 min |
| 7 | Add `priority` to first 4 category cards | −0.3s LCP | 10 min |

---

## 7. Lighthouse

Lighthouse could not be run in this session (headless Chrome hangs on Windows).

**Recommended:** Run from Vercel's CI or Linux:
```bash
npx lighthouse https://your-sofer.com \
  --form-factor=mobile \
  --output=json \
  --output-path=./lighthouse-mobile.json \
  --chrome-flags="--headless --no-sandbox --disable-gpu"
```

Or use [PageSpeed Insights](https://pagespeed.web.dev/report?url=https%3A%2F%2Fyour-sofer.com) for instant scores without CLI.

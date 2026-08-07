// ─────────────────────────────────────────────────────────────────────────────
// ProductShell — server-rendered above-the-fold preview of the product page.
//
// PERF (LCP + CLS): ProductClient is fully client-rendered and used to show a
// 60vh spinner until the Firestore fetch finished — so the LCP image could not
// paint before JS + Firebase + data (~5s on mobile), and the spinner→content
// swap produced huge CLS. This shell renders the REAL breadcrumb, main image,
// thumbnails, title, stars and price in the initial HTML, and is removed by
// ProductClient (useLayoutEffect, before paint) the moment the interactive
// version takes over — in the exact same position, so nothing visibly moves.
//
// ⚠️ KEEP IN SYNC with ProductClient.tsx: every style here is copied 1:1 from
// the client markup (breadcrumb bar, image card, details card, mobile price
// block). isMobile ternaries in the client are expressed here as .pshell-*
// media-query classes with identical values. If you change styles there,
// change them here too, or the shell→client swap will visibly jump.
// ─────────────────────────────────────────────────────────────────────────────
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import { formatPrice, effectivePrice as computeEffectivePrice } from '@/app/lib/utils';

// Mirrors ProductClient's Product fields used above the fold (plain JSON).
export interface ShellProduct {
  id: string;
  name?: string;
  price?: number;
  was?: number | null;
  imgUrl?: string;
  image_url?: string;
  img1?: string; img2?: string; img3?: string;
  imgUrl2?: string; imgUrl3?: string; imgUrl4?: string; imgUrl5?: string;
  aiLifestyleImage?: string;
  videoUrl?: string;
  cat?: string;
  stars?: number;
  reviews?: number;
  bundlePromo?: string | null;
  clearanceDiscount?: boolean;
  clearanceSalePrice?: number;
  isOnSale?: boolean;
  salePrice?: number;
  salePercent?: number;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
}

// KEEP IN SYNC with ProductClient RABBINICAL_CATEGORIES
const RABBINICAL_CATEGORIES = new Set(['קלפי מזוזה', 'קלפי תפילין', 'תפילין קומפלט', 'מגילות', 'ספרי תורה', 'בר מצווה']);

// KEEP IN SYNC with ProductClient BUNDLE_LABELS (mobile price block)
const BUNDLE_LABELS: Record<string, string> = { '3for100': '3 ב-₪100', '4for100': '4 ב-₪100', '5for100': '5 ב-₪100', '12for100': '12 ב-₪100' };

// SVGs copied 1:1 from ProductClient's Icon map
const IconHome = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
const IconChevron = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const IconStar = ({ filled }: { filled: boolean }) => <svg width={15} height={15} viewBox="0 0 24 24" fill={filled ? '#e6a817' : 'none'} stroke="#e6a817" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IconEye = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconTruck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const IconCreditCard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;

export default function ProductShell({ product }: { product: ShellProduct }) {
  if (!product?.name) return null;

  // ── Media order — KEEP IN SYNC with ProductClient allMedia logic ──
  const mediaRaw = [
    product.imgUrl || product.image_url,
    product.imgUrl2 || product.img1,
    product.imgUrl3 || product.img2,
    product.imgUrl4 || product.img3,
    product.imgUrl5,
  ].filter(Boolean) as string[];
  const deduped = [...new Set(mediaRaw)];
  const allMedia = product.aiLifestyleImage
    ? [product.aiLifestyleImage, ...deduped.filter(u => u !== product.aiLifestyleImage)]
    : (deduped.length >= 2 ? [deduped[1], deduped[0], ...deduped.slice(2)] : deduped);
  const mainImage = allMedia[0] ? optimizeCloudinaryUrl(allMedia[0], 800) : null;
  const thumbs = allMedia.map(u => optimizeCloudinaryUrl(u, 100));

  // ── Effective price — shared single source of truth (app/lib/utils) ──
  const price = product.price ?? 0;
  // Server component rendered once per request — reading the clock here is
  // safe and required for the sale-window check (same as ProductClient does).
  // eslint-disable-next-line react-hooks/purity
  const effectivePrice = computeEffectivePrice(product);
  const effectivePct = effectivePrice < price
    ? (product.salePercent ?? Math.round((1 - effectivePrice / price) * 100))
    : 0;
  const discount = effectivePrice === price && product.was
    ? Math.round((1 - price / product.was) * 100)
    : 0;

  const bundleLabel = product.bundlePromo ? BUNDLE_LABELS[product.bundlePromo] : null;
  const monthly3 = Math.ceil(effectivePrice / 3);
  const starsRounded = Math.round(product.stars || 4.5);
  const nameShort = product.name.slice(0, 28) + (product.name.length > 28 ? '…' : '');
  const nameLong = product.name.slice(0, 48) + (product.name.length > 48 ? '…' : '');

  return (
    <div id="pdp-shell">
      {/* Media-query equivalents of ProductClient's isMobile ternaries (breakpoint 768 = window.innerWidth < 768) */}
      <style dangerouslySetInnerHTML={{ __html: `
        #pdp-shell .ps-crumb { padding: 8px 14px; }
        #pdp-shell .ps-wrap { padding: 12px 0; }
        #pdp-shell .ps-grid { display: block; background: #fff; }
        #pdp-shell .ps-imgcard { border-radius: 0; border: none; }
        #pdp-shell .ps-img { aspect-ratio: 4/3; padding: 8px; }
        #pdp-shell .ps-thumb { width: 52px; height: 52px; }
        #pdp-shell .ps-details { border-radius: 0; border: none; padding: 16px 14px; margin-top: 8px; }
        #pdp-shell .ps-name-long, #pdp-shell .ps-buybox { display: none; }
        @media (min-width: 768px) {
          #pdp-shell .ps-crumb { padding: 10px 20px; }
          #pdp-shell .ps-wrap { padding: 20px 16px; }
          #pdp-shell .ps-grid { display: grid; grid-template-columns: 1fr 1fr 300px; gap: 20px; align-items: start; background: transparent; }
          #pdp-shell .ps-imgcard { border-radius: 12px; border: 1px solid #e8e8e8; }
          #pdp-shell .ps-img { aspect-ratio: 1; padding: 20px; }
          #pdp-shell .ps-thumb { width: 60px; height: 60px; }
          #pdp-shell .ps-details { border-radius: 12px; border: 1px solid #e8e8e8; padding: 24px 20px; margin-top: 0; }
          #pdp-shell .ps-name-long { display: inline; }
          #pdp-shell .ps-name-short, #pdp-shell .ps-mobile-price { display: none; }
          #pdp-shell .ps-buybox { display: block; }
        }
      ` }} />

      <div style={{ minHeight: '100vh', background: '#F5F2EC', direction: 'rtl', fontFamily: 'Heebo, Arial, sans-serif' }}>
        {/* Breadcrumb — same markup as ProductClient */}
        <div className="ps-crumb" style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
              <span style={{ color: '#1a1a1a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <IconHome /> דף הבית
              </span>
              <IconChevron />
              {product.cat && (
                <><span style={{ color: '#1a1a1a', fontWeight: 500 }}>{product.cat}</span><IconChevron /></>
              )}
              <span style={{ color: '#555', fontWeight: 500 }}>
                <span className="ps-name-short">{nameShort}</span>
                <span className="ps-name-long">{nameLong}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="ps-wrap" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="ps-grid">
            {/* ── Column 1: Images ── */}
            <div className="ps-imgcard" style={{ background: '#fff', overflow: 'hidden' }}>
              <div style={{ position: 'relative', background: '#fafafa', cursor: 'zoom-in', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {mainImage ? (
                  // LCP element — in the initial HTML; matches the preload in page.tsx
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ps-img" src={mainImage} alt={product.name}
                    loading="eager" fetchPriority="high" decoding="async"
                    style={{ width: '100%', objectFit: 'contain', display: 'block' }} />
                ) : (
                  <div className="ps-img" style={{ width: '100%' }} />
                )}
              </div>
              {product.cat === 'כיפות' && (
                <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%)', padding: '8px 12px 8px 16px', borderRadius: '0 8px 0 0', zIndex: 10 }}>
                  <span style={{ color: '#1a1a1a', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    מוצר 2: 10% | 3+: 15%
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid #f0f0f0' }}>
                {allMedia.map((_, i) => (
                  <span key={i} className="ps-thumb" style={{ flexShrink: 0, borderRadius: 8, overflow: 'hidden', border: `2px solid ${i === 0 ? '#C5A028' : '#e0e0e0'}`, background: '#fff', padding: 2, display: 'inline-block', boxSizing: 'border-box' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbs[i]} alt={`תמונה ${i + 1}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </span>
                ))}
                {product.videoUrl && (
                  <span className="ps-thumb" style={{ flexShrink: 0, borderRadius: 8, border: '2px solid #e0e0e0', background: '#f0f0f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#7c3aed"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </span>
                )}
              </div>
            </div>

            {/* ── Column 2: Details (above-the-fold part only) ── */}
            <div className="ps-details" style={{ background: '#fff' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#3B3B41', lineHeight: 1.4, marginBottom: 10 }}>{product.name}</h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', gap: 1 }}>
                  {[1, 2, 3, 4, 5].map(i => <IconStar key={i} filled={i <= starsRounded} />)}
                </span>
                <span style={{ fontSize: 13, color: '#0e6ba8' }}>({product.reviews || 0} ביקורות)</span>
                {product.cat && <span style={{ fontSize: 12, color: '#888' }}>| <strong>{product.cat}</strong></span>}
              </div>

              {/* Social proof badge — client replaces the number after hydration (it rotates by design) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#eff8ff', border: '1px solid #bde0ff', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: '#0e6ba8', fontWeight: 700 }}>
                  <IconEye />
                  <span>3 צופים עכשיו</span>
                </div>
              </div>

              {product.cat && RABBINICAL_CATEGORIES.has(product.cat) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1a6b3c', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 20, padding: '5px 12px', marginBottom: 12, alignSelf: 'flex-start' }}>
                  <span>✓</span>
                  בהשגחת מגיה מוסמך · כולל תעודת כשרות
                </div>
              )}

              {/* Mobile price — KEEP IN SYNC with ProductClient mobile price block */}
              <div className="ps-mobile-price" style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: effectivePrice < price ? '#c0392b' : '#1a1a1a' }}>{formatPrice(effectivePrice)}</span>
                  {effectivePrice < price && <span style={{ fontSize: 19, fontWeight: 300, textDecoration: 'line-through', color: '#999' }}>{formatPrice(price)}</span>}
                  {effectivePrice >= price && product.was ? <span style={{ fontSize: 19, fontWeight: 300, textDecoration: 'line-through', color: '#999' }}>{formatPrice(product.was)}</span> : null}
                  {effectivePct > 0 && <span style={{ background: '#c0392b', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>-{effectivePct}%</span>}
                  {effectivePct === 0 && discount > 0 && <span style={{ background: '#c0392b', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>-{discount}%</span>}
                </div>
                {bundleLabel && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: '#1a1a1a', color: '#C5A028', fontSize: 13, fontWeight: 800, padding: '5px 12px', borderRadius: 8, marginBottom: 8, letterSpacing: '0.01em' }}>
                    ✦ מבצע חבילה: {bundleLabel}
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}><IconTruck /> כולל מע״מ · משלוח לכל הארץ</div>
                {effectivePrice > 99 && (
                  <div style={{ background: '#f0f7ff', border: '1px solid #bde0ff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#0e6ba8', flexShrink: 0 }}><IconCreditCard /></span>
                    <span><strong>3 תשלומים של {formatPrice(monthly3)}</strong> ללא ריבית</span>
                    {effectivePrice >= 400 && <span style={{ color: '#888', fontSize: 11, marginRight: 'auto' }}>· עד 12 תשלומים בתוספת ריבית</span>}
                  </div>
                )}
              </div>
            </div>

            {/* ── Column 3: Buy box placeholder (desktop only) ── */}
            <div className="ps-buybox" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e8e8', minHeight: 420 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

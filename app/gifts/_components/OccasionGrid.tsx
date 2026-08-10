'use client';

import { useState } from 'react';
import ProductCard from '@/components/ui/ProductCard';
import type { MomentProduct } from '@/app/moment/[id]/fetchMomentProducts';

/**
 * גריד המוצרים של עמוד אירוע. קליינט בלבד — ProductCard צורך את CartContext.
 * המוצרים מגיעים מוכנים מהשרת (מקווששים), ולכן אין כאן שליפה ואין שלד טעינה.
 */

const PAGE_SIZE = 24;
const NAVY = '#373A5A';

export default function OccasionGrid({ products }: { products: MomentProduct[] }) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = products.slice(0, shown);
  const hasMore = shown < products.length;

  if (!products.length) {
    return (
      <div dir="rtl" style={{ textAlign: 'center', padding: '48px 16px', color: '#6B7280', fontSize: 15 }}>
        <p style={{ margin: '0 0 16px' }}>המוצרים לקטגוריה זו מתעדכנים כעת.</p>
        <a
          href="/category/%D7%9E%D7%AA%D7%A0%D7%95%D7%AA"
          style={{ color: NAVY, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 4 }}
        >
          לצפייה בכל המתנות ←
        </a>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 20,
        }}
      >
        {visible.map((p, i) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            price={p.price}
            images={[p.imgUrl ?? p.image_url ?? '', p.imgUrl2 ?? '', p.imgUrl3 ?? ''].filter(Boolean)}
            aiLifestyleImage={p.aiLifestyleImage}
            priority={p.priority}
            isBestSeller={p.isBestSeller}
            badge={p.badge}
            was={p.was}
            productDoc={p}
            isBundle={!!p.bundleComponentCodes?.length}
            createdAt={p.createdAt}
            hidden={p.hidden}
            aboveFold={i < 4}
            hasKlafSelection={p.hasKlafSelection}
            cat={p.cat}
            soferId={p.soferId}
            soferName={p.soferName}
            soferPhoto={p.soferPhoto}
            partnerId={p.partnerId} partnerName={p.partnerName} warehouseType={p.warehouseType}
            stars={p.stars}
            outOfStock={p.outOfStock}
          />
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button
            type="button"
            onClick={() => setShown(s => s + PAGE_SIZE)}
            style={{
              background: NAVY,
              color: '#fff',
              border: 'none',
              padding: '13px 40px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            להצגת מוצרים נוספים ({products.length - shown})
          </button>
        </div>
      )}
    </div>
  );
}

// Denormalizes a partner-uploaded product (partners/{partnerId}/products/{id}) into the
// main `products/{id}` collection so every existing storefront read path (home, category
// pages, product detail, Algolia sync) works unchanged — no code taught about the
// partners subcollection. The mirror is a read-model only; the subcollection doc stays
// the source of truth for the partner dashboard.
import { FieldValue } from 'firebase-admin/firestore';
import type { PartnerProduct, PartnerWarehouse } from '@/app/lib/partner-types';

export function buildMirrorDoc(product: PartnerProduct, warehouse: PartnerWarehouse | null) {
  return {
    name: product.name,
    price: product.price,
    imgUrl: product.images[0] ?? null,
    imgUrl2: product.images[1] ?? null,
    imgUrl3: product.images[2] ?? null,
    sku: product.sku,
    cat: product.category,
    inStock: product.stock,
    outOfStock: product.stock <= 0,
    status: product.status,
    hidden: product.status !== 'active',
    partnerId: product.partnerId,
    partnerName: product.partnerName,
    warehouseType: product.warehouseType,
    warehouseAddress: warehouse
      ? {
          city: warehouse.city,
          street: warehouse.street,
          number: warehouse.number,
          apartment: warehouse.apartment ?? '',
          zipCode: warehouse.zipCode ?? '',
          phone: warehouse.phone,
          recipientName: warehouse.recipientName,
        }
      : null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

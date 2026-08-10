// ============================================
// Partner Upgrade Coupon Type Definitions
// (separate from the product `coupons` collection — these discount the
// ₪5,000 Partner setup fee, not cart orders)
// ============================================

export type PartnerCouponType = 'percent' | 'fixed' | 'free';

export interface PartnerCoupon {
  id: string; // doc id = code (uppercased)
  code: string;
  type: PartnerCouponType;
  value: number; // percent 0-100 or ₪ amount; ignored when type === 'free'
  description: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt?: string; // ISO date "YYYY-MM-DD"
  createdAt: string;
  createdBy?: string;
}

export interface CouponValidateRequest {
  code: string;
}

export interface CouponValidateResponse {
  valid: boolean;
  message: string;
  coupon?: {
    code: string;
    type: PartnerCouponType;
    value: number;
    description: string;
  };
  discountAmount?: number;
  finalAmount?: number;
}

export interface AdminCouponCreateRequest {
  code: string;
  type: PartnerCouponType;
  value: number;
  description: string;
  maxUses: number;
  expiresAt?: string;
}

// ============================================
// Partner Stores Type Definitions
// ============================================

export type PartnerStatus =
  | 'draft'              // חשבון במהלך הרשמה
  | 'pending_payment'    // מחכה לתשלום ₪5,000
  | 'payment_received'   // תשלום התקבל
  | 'pending_review'     // ממתין לאישור אדמין
  | 'active'             // חנות פעילה
  | 'past_due'           // תשלום חודשי נכשל
  | 'suspended'          // מושהה בגלל אי-תשלום
  | 'cancelled'          // ביטול ידני
  | 'blocked'            // חסום בגלל הפרה
  | 'expired';           // תם תוקף

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export type CommissionStatus =
  | 'pending'            // בהמתנה לאישור
  | 'approved'           // אושר
  | 'payable'            // מוכן לתשלום
  | 'paid'               // שולם
  | 'reversed';          // בוטל (refund)

export interface PartnerColors {
  primary: string;       // צבע ראשי (hex)
  secondary: string;     // צבע משני
  cta: string;          // צבע כפתור CTA
}

export interface Partner {
  id: string;           // partnerId = uid
  uid: string;          // Firebase uid
  email: string;
  status: PartnerStatus;

  // פרטים עסקיים
  businessName: string;
  businessType?: string; // חברה, עצמאי, אחר
  businessId?: string;   // מספר עסק
  taxId?: string;       // מספר מס

  // פרטי בעל
  firstName?: string;
  lastName?: string;
  phone?: string;

  // חנות
  storeUrl: string;     // store name for URL (e.g., "yossi-judaica")
  storeName: string;
  storeDescription?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  colors?: PartnerColors;
  isPublished: boolean;

  // תקשורת
  whatsapp?: string;
  facebook?: string;
  instagram?: string;

  // עמלות
  commissionPercent: number;    // ברירת מחדל (20%)
  setupFeeAmount: number;       // ₪5,000
  setupFeePaid: boolean;
  setupFeePaidAt?: string;      // ISO date
  subscriptionFeeMonthly: number; // ₪400

  // מנוי
  currentSubscriptionId?: string;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStartDate?: string;
  nextBillingDate?: string;

  // Onboarding
  onboarding: {
    nameComplete: boolean;
    logoComplete: boolean;
    colorsComplete: boolean;
    whatsappComplete: boolean;
    published: boolean;
  };

  // בנקאות
  bankName?: string;
  bankBranch?: string;
  bankAccount?: string;
  accountHolder?: string;

  // Audit
  createdAt: string;     // ISO date
  updatedAt: string;
  createdBy?: string;

  // Metadata
  failedPaymentCount?: number;
  lastFailedPaymentAt?: string;
  suspended?: boolean;
  suspendedAt?: string;
  suspendedReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;

  // מחסן איסוף (Phase 13)
  warehouse?: PartnerWarehouse;
}

export interface PartnerWarehouse {
  city: string;
  street: string;
  number: string;
  apartment?: string;
  zipCode?: string;
  phone: string;
  recipientName: string;   // מוצג במשלוח LionWheel
  type: 'partner' | 'dropship'; // partner = משלוח מהמחסן שלו, dropship = שולח אלינו למחסן
  updatedAt: string;       // ISO date
}

export interface PartnerProductDimensions {
  length: number; // cm
  width: number;  // cm
  height: number; // cm
}

export type PartnerProductStatus = 'active' | 'inactive';

export interface PartnerProduct {
  id: string;
  name: string;
  description: string;
  price: number;          // ₪, > 0
  images: string[];       // Cloudinary URLs
  sku: string;             // ייחודי לפרטנר
  stock: number;           // >= 0
  category: string;
  weight: number;          // kg
  dimensions: PartnerProductDimensions;

  // Denormalized for indexing/display
  partnerId: string;
  partnerName: string;
  warehouseType: 'partner' | 'dropship';

  status: PartnerProductStatus;

  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;      // partner UID
}

export interface PartnerSubscription {
  id: string;
  partnerId: string;
  status: SubscriptionStatus;

  // Billing cycle
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;

  // Amount
  amount: number;        // ₪400
  currency: string;      // "ILS"

  // Payment tracking
  lastChargeDate?: string;
  lastChargeAmount?: number;
  lastChargeId?: string;  // Sumit transaction ID

  // Failure handling
  failureCount: number;
  lastFailedAt?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface PartnerCommissionSetting {
  id: string;
  partnerId: string;

  // Commission rate
  commissionRate: number;    // % (default 20)

  // Thresholds (for dynamic rates)
  thresholds?: Array<{
    minimumRevenue: number;  // ₪
    commissionRate: number;  // %
  }>;

  // Category-specific rates
  categoryRates?: Record<string, number>; // { "כיפות": 15, "מזוזות": 25 }

  // Excluded products
  excludedProductIds?: string[];

  // Effective period
  effectiveFrom: string;
  effectiveTo?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface PartnerEarning {
  id: string;
  partnerId: string;
  orderId: string;

  // Sale details
  saleAmount: number;
  commissionRate: number;
  commissionBase: 'subtotal' | 'after_discount' | 'after_tax';
  commissionAmount: number;

  // Status
  status: CommissionStatus;
  approvedAt?: string;
  paidAt?: string;
  payoutId?: string;    // link to partners_payouts

  // Refund tracking
  refundAmount?: number;
  refundedAt?: string;

  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface PartnerPayout {
  id: string;
  partnerId: string;

  // Amount
  amount: number;
  currency: string;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  // Bank details
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  accountHolder: string;

  // Payment reference
  transferId?: string;    // Bank transfer ID
  sumitTransactionId?: string;

  // Dates
  requestedAt: string;
  processedAt?: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;

  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface PartnerAnalyticDaily {
  id?: string;
  partnerId: string;
  date: string;          // YYYY-MM-DD

  // Traffic
  visitors: number;
  uniqueSessions: number;

  // Engagement
  productViews: number;
  addToCart: number;
  checkoutStarted: number;

  // Conversions
  purchases: number;
  revenue: number;

  // Commission
  commission: number;

  // Refunds
  refunds: number;

  // Metadata
  createdAt: string;
}

export interface PartnerApplication {
  id: string;
  email: string;
  businessName: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;

  // Status
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  approvedBy?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface PartnerOnboardingStatus {
  nameComplete: boolean;
  logoComplete: boolean;
  colorsComplete: boolean;
  whatsappComplete: boolean;
  published: boolean;

  completionPercentage: number; // 0-100
}

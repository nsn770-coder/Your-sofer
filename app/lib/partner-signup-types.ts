// ============================================
// Partner Signup Flow Type Definitions
// ============================================

export interface SignupFormData {
  email: string;
  businessName: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  businessType?: string; // חברה, עצמאי, אחר
  businessId?: string;   // מספר עסק
  taxId?: string;        // מספר מס
}

export interface SignupResponse {
  success: boolean;
  applicationId: string;
  message: string;
}

export interface PaymentInitializeResponse {
  success: boolean;
  orderId: string;
  singleUseToken: string;
  amount: number;
  currency: string;
  message?: string;
}

export interface PaymentWebhookPayload {
  orderId: string;
  key: string;
  documentId?: string;
  customerId?: string;
}

export interface PaymentWebhookRequest {
  orderId: string;
  transactionId: string;
  amount: number;
  status: string;
  timestamp: string;
}

export interface PartnerProvisioningPayload {
  uid: string;
  email: string;
  businessName: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  businessType?: string;
  businessId?: string;
  taxId?: string;
  setupFeeTransactionId: string;
  setupFeePaidAt: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  partnerId: string;
  data: Record<string, unknown>;
  processedAt: string;
  retryCount: number;
}

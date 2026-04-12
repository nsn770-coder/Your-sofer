export type OpsRole = 'owner' | 'ops_manager' | 'fulfillment';

export interface OpsUser {
  uid: string;
  email: string;
  name: string;
  role: OpsRole;
  active: boolean;
}

export type OrderStatus =
  | 'new_order'
  | 'awaiting_review'
  | 'assigned'
  | 'in_fulfillment'
  | 'waiting_supplier'
  | 'stam_processing'
  | 'stam_sent_checking'
  | 'stam_approved'
  | 'fulfillment_ready'
  | 'ready_for_shipment'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'delayed'
  | 'blocked'
  | 'cancelled';

export type OrderType = 'judaica' | 'stam' | 'mixed';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type FinancialStatus = 'paid' | 'pending' | 'refunded';

export interface OrderProduct {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  isStam: boolean;
}

export interface InternalNote {
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
}

export interface CustomerCommLog {
  authorId: string;
  authorName: string;
  channel: 'phone' | 'whatsapp' | 'email';
  summary: string;
  createdAt: any;
}

export interface JudaicaStream {
  status: string;
  owner: string;
  notes: string;
  completedAt?: any;
}

export interface StamStream {
  status: string;
  owner: string;
  soferId: string;
  klafStatus: string;
  paymentStatus: string;
  notes: string;
  completedAt?: any;
}

export interface InternalOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: { street: string; city: string; zip: string };
  orderType: OrderType;
  products: OrderProduct[];
  totalAmount: number;
  status: OrderStatus;
  primaryOwner: string;
  secondaryOwner: string;
  judaicaStream: JudaicaStream;
  stamStream: StamStream;
  financialStatus: FinancialStatus;
  shipmentTracking: string;
  shippedAt?: any;
  deliveredAt?: any;
  priority: Priority;
  isDelayed: boolean;
  isBlocked: boolean;
  delayReason: string;
  blockReason: string;
  internalNotes: InternalNote[];
  customerCommunicationLog: CustomerCommLog[];
  createdAt: any;
  updatedAt: any;
  dueDate?: any;
}

export interface AuditEntry {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  action: string;
  oldValue?: any;
  newValue?: any;
  timestamp: any;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new_order: 'הזמנה חדשה',
  awaiting_review: 'ממתין לבדיקה',
  assigned: 'הוקצה',
  in_fulfillment: 'בביצוע',
  waiting_supplier: 'ממתין לספק',
  stam_processing: 'עיבוד סת"מ',
  stam_sent_checking: 'נשלח לבדיקה',
  stam_approved: 'סת"מ אושר',
  fulfillment_ready: 'מוכן להשלמה',
  ready_for_shipment: 'מוכן למשלוח',
  shipped: 'נשלח',
  delivered: 'נמסר',
  completed: 'הושלם',
  delayed: 'מאוחר',
  blocked: 'חסום',
  cancelled: 'בוטל',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'נמוך',
  normal: 'רגיל',
  high: 'גבוה',
  urgent: 'דחוף',
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  judaica: 'יודאיקה',
  stam: 'סת"מ',
  mixed: 'מעורב',
};

// Statuses that fulfillment can set
export const FULFILLMENT_ALLOWED_STATUSES: OrderStatus[] = [
  'in_fulfillment',
  'waiting_supplier',
  'fulfillment_ready',
  'ready_for_shipment',
  'shipped',
  'delivered',
];

// Statuses ops_manager cannot override
export const OPS_MANAGER_BLOCKED_STATUSES: OrderStatus[] = [
  'cancelled',
  'completed',
];

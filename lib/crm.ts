export type CrmStatus = 'חדש' | 'בטיפול' | 'ממתין ללקוח' | 'הצעת מחיר' | 'עסקה נסגרה' | 'לא רלוונטי';
export type CrmSource = 'whatsapp' | 'אתר' | 'טלפון' | 'אחר';

export interface CrmNote {
  text: string;
  ts: number;
}

export interface CrmLead {
  phone: string;
  name?: string | null;
  source: CrmSource;
  status: CrmStatus;
  saleStage?: string | null;
  notes?: CrmNote[];
  followUpAt?: number | null;
  assignedTo?: string | null;
  createdAt?: unknown;
  lastContactAt?: unknown;
}

export const CRM_STATUSES: CrmStatus[] = [
  'חדש', 'בטיפול', 'ממתין ללקוח', 'הצעת מחיר', 'עסקה נסגרה', 'לא רלוונטי',
];

export const CRM_SOURCES: CrmSource[] = ['whatsapp', 'אתר', 'טלפון', 'אחר'];

// Validated categorical palette (dataviz skill, all-pairs CVD-safe) — direct labels
// are shown alongside these on every chart since a few pairs sit in the CVD-warn band.
export const CRM_STATUS_COLORS: Record<CrmStatus, string> = {
  'חדש': '#2a78d6',
  'בטיפול': '#eda100',
  'ממתין ללקוח': '#4a3aa7',
  'הצעת מחיר': '#1baf7a',
  'עסקה נסגרה': '#008300',
  'לא רלוונטי': '#e34948',
};

export const CRM_SOURCE_COLORS: Record<CrmSource, string> = {
  whatsapp: '#1baf7a',
  'אתר': '#2a78d6',
  'טלפון': '#eb6834',
  'אחר': '#4a3aa7',
};

// Normalizes a phone number for cross-format matching (WhatsApp E.164-ish digits
// vs. local Israeli formats entered at checkout) by comparing the last 9 digits.
export function normalizePhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.slice(-9);
}

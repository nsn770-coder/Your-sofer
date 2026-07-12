/**
 * faqAnalytics.ts — אירועי אנליטיקה למערכת השאלות והתשובות.
 *
 * משתמש בתשתית הקיימת (GTM dataLayer / window.gtag שמוגדר ב-layout.tsx).
 * אין לשלוח מידע אישי: לא קוד הזמנה, לא שם, לא טלפון, לא מייל.
 */

export type FaqEventName =
  | 'faq_search'
  | 'faq_question_open'
  | 'faq_category_click'
  | 'faq_whatsapp_click'
  | 'faq_order_status_click'
  | 'faq_start_design_click'
  | 'faq_human_agent_click';

export interface FaqEventParams {
  /** מזהה השאלה (לא מידע אישי) */
  question_id?: string;
  /** מזהה/שם קטגוריה */
  category?: string;
  /** שם העמוד שבו קרה האירוע (pathname) */
  page?: string;
  /** טקסט חיפוש — ללא מידע אישי, נחתך ל-100 תווים */
  search_term?: string;
  /** מספר תוצאות חיפוש */
  results_count?: number;
}

export function trackFaqEvent(name: FaqEventName, params: FaqEventParams = {}): void {
  if (typeof window === 'undefined') return;
  const safe: FaqEventParams = { ...params };
  if (safe.search_term) safe.search_term = safe.search_term.slice(0, 100);
  try {
    window.gtag?.('event', name, safe as Record<string, unknown>);
  } catch {
    // אנליטיקה לעולם לא מפילה את הדף
  }
}

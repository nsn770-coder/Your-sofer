import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/app/firebase';

export interface NewsletterRecipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  sourceLabel: string;
  consent: boolean;
  optOut: boolean;
  createdAt?: { seconds: number };
}

const SOURCE_LABELS: Record<string, string> = {
  club:           'מועדון',
  mezuzah_funnel: 'פאנל מזוזות',
  newsletter:     'ניוזלטר',
  lead:           'ליד',
  order_customer: 'לקוח (רכש באתר)',
};

// סטטוסים שנחשבים "לקוח ששילם" — זהים ליתר הדשבורד
const PAID_STATUSES = new Set(['paid', 'completed', 'shipped', 'packing', 'magiah']);

/**
 * Returns every contact eligible to receive a newsletter:
 * consent given, not opted out, has a valid email address.
 * Deduplicates by email — first source wins.
 *
 * To add a new source in the future, append a block below the TODO comment.
 */
export async function getEligibleRecipients(): Promise<NewsletterRecipient[]> {
  const all: NewsletterRecipient[] = [];

  // ── Source 1: leads ───────────────────────────────────────────────────────
  const leadsSnap = await getDocs(
    query(collection(db, 'leads'), orderBy('createdAt', 'desc'))
  );
  leadsSnap.forEach(d => {
    const data = d.data();
    if (data.consent !== true) return;
    if (data.optOut === true)  return;
    if (!data.email)           return;
    all.push({
      id:          d.id,
      name:        data.name  || '',
      email:       (data.email as string).toLowerCase().trim(),
      phone:       data.phone || '',
      source:      (data.source as string) || 'lead',
      sourceLabel: SOURCE_LABELS[(data.source as string) || ''] ?? 'ליד',
      consent:     true,
      optOut:      false,
      createdAt:   data.createdAt,
    });
  });

  // ── Source 2: לקוחות ששילמו באתר (אימייל מתוך ההזמנות) ────────────────────
  // בסיס "לקוח קיים": מי שרכש באתר רשאי לקבל דיוור על שירותים דומים,
  // עם קישור הסרה בכל מייל. optOut נבדק שוב בצד השרת מול leads לפני שליחה.
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    ordersSnap.forEach(d => {
      const data = d.data();
      if (!PAID_STATUSES.has(String(data.status ?? ''))) return;
      const email = (data.email as string | undefined)?.toLowerCase().trim();
      if (!email) return;
      all.push({
        id:          'order_' + d.id,
        name:        (data.customerName as string) || '',
        email,
        phone:       (data.phone as string) || '',
        source:      'order_customer',
        sourceLabel: SOURCE_LABELS.order_customer,
        consent:     true,
        optOut:      false,
        createdAt:   data.createdAt as { seconds: number } | undefined,
      });
    });
  } catch (e) {
    console.error('[getEligibleRecipients] orders source failed (non-fatal):', e);
  }

  // TODO: בעתיד — הוסף users עם newsletterSubscribed
  // const usersSnap = await getDocs(
  //   query(collection(db, 'users'), where('newsletterSubscribed', '==', true))
  // );
  // usersSnap.forEach(d => {
  //   const data = d.data();
  //   if (data.optOut === true) return;
  //   if (!data.email)          return;
  //   all.push({
  //     id:          'user_' + d.id,
  //     name:        data.displayName || data.name || '',
  //     email:       (data.email as string).toLowerCase().trim(),
  //     phone:       data.phone || '',
  //     source:      'user',
  //     sourceLabel: 'משתמש רשום',
  //     consent:     true,
  //     optOut:      false,
  //     createdAt:   data.createdAt,
  //   });
  // });

  // Deduplicate by email — first occurrence (earlier source) wins
  const seen = new Set<string>();
  return all.filter(r => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
}

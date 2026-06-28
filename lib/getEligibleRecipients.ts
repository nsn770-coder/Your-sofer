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
};

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

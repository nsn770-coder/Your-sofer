import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';

// POST /api/club-join — completes a club sign-up for the AUTHENTICATED user.
//
// Called by ClubPopup after a successful Google sign-in. The caller proves who
// they are with their Firebase ID token (Authorization: Bearer <idToken>) — the
// server acts only on the verified uid/email, so the endpoint cannot be used to
// touch anyone else's data.
//
// What it does (all with the Admin SDK — `leads` is admin-read-only by rules):
// 1. If users/{uid} is already a club member → returns { alreadyMember: true }.
// 2. Looks for existing leads with the same (verified) email — "old" club
//    sign-ups from the previous email+phone popup. If found: links the lead to
//    this uid and recovers the phone number onto the user profile (only when
//    the profile doesn't already have one).
// 3. If no lead exists → creates one ({ source:'club' }), so new members keep
//    flowing into the same mailing list the bulk-email system reads.
// 4. Marks users/{uid} as a club member (clubMember / clubJoinedAt /
//    clubConsent / newsletterSubscribed).

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ── Authenticate the caller ─────────────────────────────────────────────
    const authHeader = req.headers.get('authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ ok: false, error: 'Missing auth token' }, { status: 401 });
    }

    let uid: string;
    let email: string;
    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken);
      uid = decoded.uid;
      email = (decoded.email ?? '').trim().toLowerCase();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid auth token' }, { status: 401 });
    }
    if (!email) {
      return NextResponse.json({ ok: false, error: 'Account has no email' }, { status: 400 });
    }

    const db = getAdminDb();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.data() ?? {};

    // ── Already a member — nothing to do (and no duplicate welcome email) ───
    if (userData.clubMember === true) {
      return NextResponse.json({ ok: true, alreadyMember: true });
    }

    // ── Email-match against existing leads (old popup sign-ups) ─────────────
    let matchedLead = false;
    let recoveredPhone: string | null = null;
    try {
      const leadsSnap = await db
        .collection('leads')
        .where('email', '==', email)
        .limit(10)
        .get();

      if (!leadsSnap.empty) {
        matchedLead = true;
        for (const leadDoc of leadsSnap.docs) {
          const lead = leadDoc.data();
          if (!recoveredPhone && typeof lead.phone === 'string' && lead.phone.trim()) {
            recoveredPhone = lead.phone.trim();
          }
        }
        // Link the lead(s) to the real user so the identity isn't duplicated.
        await Promise.all(
          leadsSnap.docs.map((leadDoc) =>
            leadDoc.ref.update({ uid, linkedAt: FieldValue.serverTimestamp() }),
          ),
        );
      } else {
        // New member — keep the mailing list fed exactly like the old popup did.
        await db.collection('leads').add({
          email,
          phone: typeof userData.phone === 'string' ? userData.phone : '',
          source: 'club',
          consent: true,
          uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      // Lead bookkeeping must never block the join itself.
      console.error('[club-join] leads lookup/link failed (non-fatal):', e);
    }

    // ── Mark membership on the user doc (merge — doc may be freshly created) ─
    const userPhone = typeof userData.phone === 'string' && userData.phone.trim() ? userData.phone : null;
    await userRef.set(
      {
        clubMember: true,
        clubJoinedAt: FieldValue.serverTimestamp(),
        clubConsent: true,
        newsletterSubscribed: true,
        ...(recoveredPhone && !userPhone ? { phone: recoveredPhone } : {}),
      },
      { merge: true },
    );

    return NextResponse.json({
      ok: true,
      alreadyMember: false,
      matchedLead,
      phoneRecovered: Boolean(recoveredPhone && !userPhone),
    });
  } catch (err) {
    console.error('[club-join]', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

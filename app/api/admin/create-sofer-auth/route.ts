import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const adminDb   = getAdminDb();
    const adminAuth = getAdminAuth();

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!idToken) {
      return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 });
    }

    const { email, displayName, soferId } = await req.json();
    if (!email || !soferId) {
      return NextResponse.json({ error: 'email and soferId are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if Firebase Auth user already exists
    let uid: string;
    let wasCreated = false;
    try {
      const existing = await adminAuth.getUserByEmail(normalizedEmail);
      uid = existing.uid;
    } catch (err: any) {
      if (err.code !== 'auth/user-not-found') throw err;
      // Create new Firebase Auth account
      const newUser = await adminAuth.createUser({
        email: normalizedEmail,
        displayName: displayName || '',
        password: 'Sofer2024!',
        emailVerified: false,
      });
      uid = newUser.uid;
      wasCreated = true;
    }

    // Ensure users collection doc is correct
    const usersSnap = await adminDb.collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();

    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      await userDoc.ref.set(
        { uid, role: 'sofer', soferId, neverLoggedIn: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } else {
      await adminDb.collection('users').doc(uid).set({
        email: normalizedEmail,
        displayName: displayName || '',
        role: 'sofer',
        soferId,
        status: 'active',
        uid,
        neverLoggedIn: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ uid, wasCreated });
  } catch (err: any) {
    console.error('[create-sofer-auth]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

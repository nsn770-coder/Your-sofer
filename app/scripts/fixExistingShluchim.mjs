// fixExistingShluchim.mjs
// עובר על כל הבקשות המאושרות ב-shluchim_applications ומתקן:
//   1. מוסיף shaliachId למסמך shluchim אם חסר
//   2. מעדכן users/{uid} עם role: 'shaliach' ו-shaliachId
//
// מצב בדיקה (ללא כתיבה):
//   node app/scripts/fixExistingShluchim.mjs --test
// ריצה אמיתית:
//   node app/scripts/fixExistingShluchim.mjs

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ══ Firebase ══
const serviceAccount = resolve(__dirname, '../../your-sofer-firebase-adminsdk-fbsvc-418544c2de.json');
if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const TEST = process.argv.includes('--test');

if (TEST) {
  console.log('🧪 מצב בדיקה — ללא כתיבה ל-Firestore\n');
} else {
  console.log('🚀 מצב ריצה אמיתית — כותב ל-Firestore\n');
}

// ══ שלב 1: שליפת כל הבקשות המאושרות ══
const appsSnap = await db.collection('shluchim_applications')
  .where('status', '==', 'approved')
  .get();

console.log(`📋 נמצאו ${appsSnap.size} בקשות מאושרות\n`);

let fixed = 0;
let alreadyOk = 0;
let noUser = 0;
let failed = 0;

for (const appDoc of appsSnap.docs) {
  const app = appDoc.data();
  const appId = appDoc.id;
  const email = (app.email || '').trim().toLowerCase();
  const approvedDocId = app.approvedDocId || appId;

  console.log(`──────────────────────────────────`);
  console.log(`📄 בקשה: ${appId}`);
  console.log(`   שם: ${app.name || '—'} | אימייל: ${email || '—'}`);
  console.log(`   approvedDocId: ${approvedDocId}`);

  // ══ שלב 2: מצא uid מתוך users לפי אימייל ══
  let uid = null;
  if (email) {
    const userSnap = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (!userSnap.empty) {
      uid = userSnap.docs[0].id;
      console.log(`   👤 נמצא uid: ${uid}`);
    } else {
      console.log(`   ⚠️  לא נמצא משתמש עם אימייל זה`);
    }
  }

  // ══ שלב 3: בדוק מסמך shluchim ══
  const shluchimRef = db.collection('shluchim').doc(approvedDocId);
  const shluchimSnap = await shluchimRef.get();

  // ══ שלב 4: קבע את ה-shaliachId הנכון ══
  // אם יש uid — עדיף להשתמש בו כ-docId
  const correctShaliachId = uid || approvedDocId;
  const correctDocId = uid || approvedDocId;
  const correctShluchimRef = db.collection('shluchim').doc(correctDocId);

  let shluchimNeedsCreate = false;
  let currentShaliachId = null;

  if (!shluchimSnap.exists) {
    if (uid && correctDocId !== approvedDocId) {
      // נסה גם את uid כ-docId
      const byUidSnap = await correctShluchimRef.get();
      if (byUidSnap.exists) {
        const d = byUidSnap.data();
        currentShaliachId = d.shaliachId;
        console.log(`   ℹ️  מסמך shluchim/${approvedDocId} לא קיים, אבל נמצא shluchim/${correctDocId}`);
      } else {
        shluchimNeedsCreate = true;
        console.log(`   ⚠️  מסמך shluchim לא קיים — ייווצר חדש ב-shluchim/${correctDocId}`);
      }
    } else {
      shluchimNeedsCreate = true;
      console.log(`   ⚠️  מסמך shluchim/${approvedDocId} לא קיים — ייווצר`);
    }
  } else {
    currentShaliachId = shluchimSnap.data().shaliachId;
  }

  // ══ שלב 5: בדוק מה צריך תיקון ══
  const shluchimNeedsUpdate = !shluchimNeedsCreate && !currentShaliachId;

  let userNeedsUpdate = false;
  let userData = null;
  if (uid) {
    const userRef = db.collection('users').doc(uid);
    const userDocSnap = await userRef.get();
    if (userDocSnap.exists) {
      userData = userDocSnap.data();
      if (userData.role === 'admin') {
        console.log(`   ⚠️  המשתמש הוא admin — לא משנים role`);
        userNeedsUpdate = false;
      } else {
        userNeedsUpdate = userData.role !== 'shaliach' || userData.shaliachId !== correctShaliachId;
      }
    }
  }

  if (!shluchimNeedsCreate && !shluchimNeedsUpdate && !userNeedsUpdate) {
    console.log(`   ✅ כבר תקין — אין צורך בשינוי`);
    alreadyOk++;
    continue;
  }

  // ══ שלב 6: הדפס מה ישתנה ══
  if (shluchimNeedsCreate) {
    console.log(`   🔧 shluchim/${correctDocId} — ייווצר מנתוני הבקשה (shaliachId: ${correctShaliachId})`);
  } else if (shluchimNeedsUpdate) {
    console.log(`   🔧 shluchim/${correctDocId} — יתווסף shaliachId: ${correctShaliachId}`);
  }
  if (userNeedsUpdate && uid) {
    console.log(`   🔧 users/${uid} — role: '${userData?.role || '?'}' → 'shaliach', shaliachId: ${correctShaliachId}`);
  }
  if (!uid) {
    console.log(`   ℹ️  אין משתמש רשום — shaliachId יוגדר על shluchim בלבד`);
    noUser++;
  }

  if (TEST) {
    fixed++;
    continue;
  }

  // ══ שלב 7: בצע עדכונים ══
  try {
    if (shluchimNeedsCreate) {
      await correctShluchimRef.set({
        name: app.name || '',
        chabadName: app.chabadName || '',
        city: app.city || '',
        phone: app.phone || '',
        email: app.email || '',
        rabbiName: app.rabbiName || '',
        logoUrl: app.logoUrl || '',
        status: 'active',
        commissionPercent: 0,
        shaliachId: correctShaliachId,
        createdAt: FieldValue.serverTimestamp(),
        ...(uid ? { uid } : {}),
      });
      // עדכן את הבקשה עם ה-docId החדש אם השתנה
      if (correctDocId !== approvedDocId) {
        await db.collection('shluchim_applications').doc(appId).update({
          approvedDocId: correctDocId,
        });
      }
    } else if (shluchimNeedsUpdate) {
      await correctShluchimRef.update({ shaliachId: correctShaliachId });
    }
    if (userNeedsUpdate && uid) {
      await db.collection('users').doc(uid).update({
        role: 'shaliach',
        shaliachId: correctShaliachId,
      });
    }
    fixed++;
    console.log(`   ✅ עודכן בהצלחה`);
  } catch (err) {
    console.log(`   ❌ שגיאה: ${err.message}`);
    failed++;
  }
}

console.log(`\n══════════════════════════════════`);
console.log(`🎉 סיום!`);
console.log(`✅ תוקנו:       ${fixed}`);
console.log(`⏭  כבר תקינים:  ${alreadyOk}`);
console.log(`👤 ללא חשבון:   ${noUser}`);
console.log(`❌ נכשלו:       ${failed}`);
if (TEST) {
  console.log(`\n🧪 זו הייתה ריצת בדיקה. הפעל ללא --test לעדכון אמיתי.`);
}

process.exit(0);

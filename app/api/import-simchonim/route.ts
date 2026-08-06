/**
 * /api/import-simchonim
 *
 * Import Simchonim products directly to Firestore
 * Using Firebase Admin SDK (server-side, not REST API)
 *
 * Usage:
 * curl -X POST https://your-sofer.com/api/import-simchonim \
 *   -H "Authorization: Bearer <CRON_SECRET>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"products": [...]}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
let db: any;
try {
  const app = getApp();
  db = getFirestore(app);
} catch {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId) {
    console.error('❌ Missing Firebase credentials in environment');
  } else {
    initializeApp({ credential: cert(serviceAccount as any) });
    db = getFirestore();
  }
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('Authorization')?.replace('Bearer ', '');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { products } = await req.json();

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'No products provided' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Firebase not initialized' },
        { status: 500 }
      );
    }

    // Import products to Firestore
    const batch = db.batch();
    let imported = 0;

    for (const product of products) {
      const docId = `simchonim_${product.supplier_sku}`;
      const docRef = db.collection('products').doc(docId);

      batch.set(
        docRef,
        {
          name: product.name || '',
          price: product.price || 0,
          original_price: product.original_price || 0,
          cat: product.category || 'מתנות',
          subCategory: 'imported',
          supplier: 'simchonim',
          supplier_sku: product.supplier_sku || '',
          supplier_url: product.supplier_url || '',
          active: product.active !== false,
          createdAt: new Date(),
          supplier_imported_at: new Date(),
        },
        { merge: true }
      );

      imported++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      imported,
      total: products.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Import failed',
      },
      { status: 500 }
    );
  }
}

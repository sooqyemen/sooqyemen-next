// app/api/public-id/route.js
import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

/**
 * POST /api/public-id
 * Generate or fetch sequential public user ID (U-000001, U-000002, etc.)
 * Requires: Authorization Bearer token
 * Returns: { publicId: "U-000123", cached: boolean }
 */
export async function POST(request) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify Firebase token
    if (!adminAuth) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const uid = decodedToken.uid;

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Check if user already has a public ID
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (userDoc.exists && userDoc.data()?.publicId) {
      return NextResponse.json({
        publicId: userDoc.data().publicId,
        cached: true
      });
    }

    // Generate new sequential ID using Firestore transaction
    const counterRef = adminDb.collection('counters').doc('publicUserId');
    
    const newPublicId = await adminDb.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      
      let nextNumber = 1;
      if (counterDoc.exists) {
        nextNumber = (counterDoc.data()?.nextNumber || 0) + 1;
      }
      
      // Update counter
      transaction.set(counterRef, { nextNumber }, { merge: true });
      
      // Format: U-000001
      const publicId = `U-${String(nextNumber).padStart(6, '0')}`;
      
      // Save to user document
      transaction.set(
        adminDb.collection('users').doc(uid),
        { publicId, publicIdCreatedAt: new Date() },
        { merge: true }
      );
      
      return publicId;
    });

    return NextResponse.json({
      publicId: newPublicId,
      cached: false
    });

  } catch (error) {
    console.error('[public-id] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

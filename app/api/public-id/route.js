import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { randomInt } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 503 }
    );
  }

  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Check if user already has a publicId
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (userDoc.exists && userDoc.data()?.publicId) {
      return NextResponse.json({ publicId: userDoc.data().publicId });
    }

    // Generate a new public ID (6-digit number)
    let publicId = '';
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to generate a unique publicId
    while (!isUnique && attempts < maxAttempts) {
      publicId = randomInt(100000, 1000000).toString();
      
      // Check if publicId already exists
      const existingUser = await adminDb.collection('users')
        .where('publicId', '==', publicId)
        .limit(1)
        .get();
      
      if (existingUser.empty) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique public ID' },
        { status: 500 }
      );
    }

    // Save to Firestore
    await adminDb.collection('users').doc(uid).set(
      { 
        publicId, 
        updatedAt: new Date() 
      },
      { merge: true }
    );

    return NextResponse.json({ publicId });
  } catch (error) {
    console.error('[public-id] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

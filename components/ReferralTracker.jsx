// components/ReferralTracker.jsx
'use client';

import { useEffect } from 'react';
import { db } from '@/lib/firebaseClient';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

function safeStr(v) {
  return String(v || '').trim();
}

function randomToken(len = 24) {
  try {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
}

function getOrCreateDeviceToken() {
  if (typeof window === 'undefined') return '';
  const key = 'sy_device_token_v1';
  let t = safeStr(localStorage.getItem(key));
  if (!t) {
    t = `d_${randomToken(20)}`;
    localStorage.setItem(key, t);
  }
  return t;
}

function getRefFromUrl() {
  if (typeof window === 'undefined') return '';
  const sp = new URLSearchParams(window.location.search || '');
  return safeStr(sp.get('ref'));
}

function setStoredRef(code) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sy_ref_code', safeStr(code));
  localStorage.setItem('sy_ref_at', String(Date.now()));
}

function getStoredRef() {
  if (typeof window === 'undefined') return '';
  return safeStr(localStorage.getItem('sy_ref_code'));
}

async function logEvent({ type, refCode, uid = null }) {
  const code = safeStr(refCode);
  if (!code) return;

  const deviceToken = getOrCreateDeviceToken();

  const payload = {
    type, // 'click' | 'signup'
    refCode: code,
    uid: uid || null,
    deviceToken,
    path: typeof window !== 'undefined' ? window.location.pathname : '',
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdAtClient: new Date(),
    status: 'pending', // مبدئياً (تقدر لاحقاً تحوله eligible بعد OTP/مراجعة)
  };

  try {
    await db.collection('ref_events').add(payload);
  } catch (e) {
    console.error('ref log error:', e);
  }
}

export default function ReferralTracker({ user, loading }) {
  // 1) track click once per session when ref exists in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    getOrCreateDeviceToken();

    const ref = getRefFromUrl();
    if (!ref) return;

    // خزّن ref (آخر ref دخل به المستخدم)
    setStoredRef(ref);

    // سجل click مرة واحدة في نفس الجلسة
    const sessionKey = `sy_ref_click_logged_${ref}`;
    const already = sessionStorage.getItem(sessionKey);
    if (!already) {
      sessionStorage.setItem(sessionKey, '1');
      logEvent({ type: 'click', refCode: ref });
    }
  }, []);

  // 2) track signup once per user+ref
  useEffect(() => {
    if (loading) return;
    if (!user?.uid) return;

    const refCode = getStoredRef();
    if (!refCode) return;

    const onceKey = `sy_ref_signup_logged_${user.uid}_${refCode}`;
    const already = typeof window !== 'undefined' ? localStorage.getItem(onceKey) : '1';
    if (already) return;

    (async () => {
      await logEvent({ type: 'signup', refCode, uid: user.uid });
      try {
        localStorage.setItem(onceKey, '1');
      } catch {}
    })();
  }, [user?.uid, loading]);

  return null;
}

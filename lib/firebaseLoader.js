'use client';

// Idle timeout is kept short (1.2s) to avoid delaying critical auth/profile listeners.
const IDLE_TIMEOUT_MS = 1200;
const IDLE_FALLBACK_MS = 300;

let firebaseClientPromise = null;

export const loadFirebaseClient = () => {
  if (!firebaseClientPromise) {
    firebaseClientPromise = import('./firebaseClient');
  }
  return firebaseClientPromise;
};

export const scheduleIdleCallback = (fn) => {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS });
    return () => {
      if (typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(id);
      }
    };
  }

  const timeoutId = setTimeout(fn, IDLE_FALLBACK_MS);
  return () => clearTimeout(timeoutId);
};

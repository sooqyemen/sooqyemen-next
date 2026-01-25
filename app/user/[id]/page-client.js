'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import ListingCard from '@/components/ListingCard';
import { db } from '@/lib/firebaseClient';

function safeText(v) {
  return typeof v === 'string' ? v : '';
}

function pickUserId(params) {
  // ✅ يقبل أي تسمية محتملة للباراميتر حتى لو تغيّر اسم المجلد
  const raw =
    params?.id ||
    params?.userId ||
    params?.uid ||
    params?.userid ||
    params?.UserId ||
    '';

  let decoded = String(raw || '').trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // ignore
  }
  return decoded;
}

function isValidId(v) {
  const s = String(v || '').trim();
  // ✅ UID الخاص بـ Firebase غالبًا 28+، وهذا التحقق مرن (بدون ما يمنع UIDs الصحيحة)
  return /^[A-Za-z0-9_-]{6,128}$/.test(s);
}

export default function UserListingsPageClient({ params }) {
  const userId = useMemo(() => pickUserId(params), [params]);

  const PAGE_SIZE = 24;
  const lastDocRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [listings, setListings] = useState([]);
  const [userName, setUserName] = useState('');
  const [search, setSearch] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchFirst = useCallback(async () => {
    setErr('');

    if (!userId || !isValidId(userId)) {
      setListings([]);
      setUserName('');
      setHasMore(false);
      setLoading(false);
      setErr('معرّف المستخدم غير صحيح.');
      return;
    }

    setLoading(true);
    try {
      // ✅ نحاول بأفضل ترتيب، ولو طلع Index Error نرجع لفallback
      let snap = null;

      try {
        snap = await db
          .collection('listings')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(PAGE_SIZE)
          .get();
      } catch (e) {
        // fallback بدون orderBy لتفادي مشاكل الفهارس
        snap = await db
          .collection('listings')
          .where('userId', '==', userId)
          .limit(PAGE_SIZE)
          .get();
      }

      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      // محاولة استخراج اسم/إيميل المعلن من أول إعلان
      const first = items[0];
      const name =
        safeText(first?.userName) ||
        safeText(first?.userEmail).split('@')[0] ||
        '';

      setUserName(name);
      setListings(items);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    } catch (e) {
      console.error('[user page] fetchFirst error:', e);
      setErr('تعذر تحميل إعلانات هذا المعلن.');
      setLoading(false);
      setHasMore(false);
    }
  }, [userId]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    if (!lastDocRef.current) return;

    setLoadingMore(true);
    setErr('');

    try {
      let snap = null;

      try {
        snap = await db
          .collection('listings')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .startAfter(lastDocRef.current)
          .limit(PAGE_SIZE)
          .get();
      } catch (e) {
        // fallback بدون orderBy/startAfter (نكتفي بتحميل دفعة واحدة غالبًا)
        // (لو تحتاج pagination قوي بدون orderBy لازم Index مضبوط)
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      const items = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      setListings((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev, ...items.filter((x) => !seen.has(x.id))];
        return merged;
      });

      lastDocRef.current = snap.docs[snap.docs.length - 1] || lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      console.error('[user page] fetchMore error:', e);
      setErr('تعذر تحميل المزيد.');
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, userId]);

  useEffect(() => {
    fetchFirst();
  }, [fetchFirst]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listings;

    return listings.filter((l) => {
      const title = safeText(l.title).toLowerCase();
      const city = safeText(l.city).toLowerCase();
      const desc = safeText(l.description).toLowerCase();
      const loc = safeText(l.locationLabel).toLowerCase();
      return title.includes(q) || city.includes(q) || desc.includes(q) || loc.includes(q);
    });
  }, [listings, search]);

  return (
    <div dir="rtl" className="container" style={{ paddingTop: 18, paddingBottom: 30 }}>
      <div className="card" style={{ padding: 16, borderRadius: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>إعلانات المعلن</div>
            <div style={{ opacity: 0.8, marginTop: 4 }}>
              {userName ? `الاسم: ${userName}` : 'المعرّف:'} <span style={{ fontWeight: 800 }}>{userId || '—'}</span>
            </div>
          </div>

          <Link className="btn" href="/" style={{ textDecoration: 'none' }}>
            ⬅️ الرئيسية
          </Link>
        </div>

        <div style={{ marginTop: 12, position: 'relative' }}>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث داخل إعلانات هذا المعلن..."
            style={{ width: '100%', paddingLeft: 44 }}
          />
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>🔍</div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 22, borderRadius: 14, textAlign: 'center' }}>
          جاري التحميل...
        </div>
      ) : err ? (
        <div
          className="card"
          style={{
            padding: 18,
            borderRadius: 14,
            background: '#fff1f2',
            border: '1px solid rgba(220,38,38,0.25)',
          }}
        >
          <div style={{ fontWeight: 1000, marginBottom: 6, color: '#b91c1c' }}>حدث خطأ</div>
          <div style={{ marginBottom: 12 }}>{err}</div>
          <button className="btn btnPrimary" onClick={fetchFirst}>
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 22, borderRadius: 14, textAlign: 'center' }}>
          لا توجد إعلانات لهذا المعلن حالياً.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} variant="grid" />
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            {hasMore ? (
              <button className="btn" onClick={fetchMore} disabled={loadingMore}>
                {loadingMore ? '...جاري التحميل' : 'تحميل المزيد'}
              </button>
            ) : (
              <div className="muted" style={{ padding: 10 }}>لا يوجد المزيد</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// app/user/[id]/page.js
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import Price from '@/components/Price';
import { loadFirebaseClient, scheduleIdleCallback } from '@/lib/firebaseLoader';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function safeText(v) {
  return typeof v === 'string' ? v : '';
}

function formatRelative(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return 'قبل قليل';
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins <= 1) return 'الآن';
    if (mins < 60) return `قبل ${mins} دقيقة`;
    if (hrs < 24) return `قبل ${hrs} ساعة`;
    if (days < 7) return `قبل ${days} يوم`;
    if (days < 30) return `قبل ${Math.floor(days / 7)} أسبوع`;
    return d.toLocaleDateString('ar-YE');
  } catch {
    return 'قبل قليل';
  }
}

function ListingMiniCard({ listing }) {
  const img = (Array.isArray(listing.images) && listing.images[0]) || listing.image || null;
  const desc = safeText(listing.description).trim();
  const shortDesc = desc.length > 90 ? `${desc.slice(0, 90)}...` : desc || '—';

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="uCard"
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        background: '#fff',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 12,
          overflow: 'hidden',
          background: '#f1f5f9',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {img ? (
          <Image
            src={img}
            alt={listing.title || 'صورة الإعلان'}
            fill
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            sizes="120px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              color: '#94a3b8',
            }}
          >
            🖼️
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 15,
                lineHeight: 1.3,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={listing.title || ''}
            >
              {listing.title || 'بدون عنوان'}
            </div>

            <div style={{ marginTop: 4, fontSize: 13, color: '#64748b', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>📍 {listing.city || listing.locationLabel || 'غير محدد'}</span>
              <span>⏱️ {formatRelative(listing.createdAt)}</span>
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <Price
              priceYER={listing.currentBidYER || listing.priceYER || 0}
              originalPrice={listing.originalPrice}
              originalCurrency={listing.originalCurrency}
              showCurrency={true}
            />
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            color: '#475569',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {shortDesc}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>👁️ {Number(listing.views || 0).toLocaleString('ar-YE')}</span>
          {listing.auctionEnabled ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              }}
            >
              ⚡ مزاد
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function UserListingsPage({ params }) {
  const userId = decodeURIComponent(String(params?.id || ''));

  const PAGE_SIZE = 24;
  const lastDocRef = useRef(null);
  const loadMoreRef = useRef(null);
  const aliveRef = useRef(true);

  const [items, setItems] = useState([]);
  const [ownerFieldUsed, setOwnerFieldUsed] = useState('userId');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const fetchFirst = useCallback(async () => {
    if (!userId) {
      setErr('معرّف المستخدم غير صحيح.');
      setLoading(false);
      setHasMore(false);
      return;
    }

    setLoading(true);
    setErr('');

    try {
      const { db } = await loadFirebaseClient();

      const ownerFields = ['userId', 'ownerId', 'uid', 'createdBy'];
      let pickedField = ownerFields[0];
      let snap = null;

      for (const f of ownerFields) {
        try {
          const q = db
            .collection('listings')
            .where(f, '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(PAGE_SIZE);

          const s = await q.get();
          if (!snap || s.size > 0) {
            snap = s;
            pickedField = f;
          }
          if (s.size > 0) break;
        } catch {
          // ignore and try next field
        }
      }

      if (!snap) {
        // fallback: try userId without orderBy (إذا فشل index)
        const s = await db.collection('listings').where('userId', '==', userId).limit(PAGE_SIZE).get();
        snap = s;
        pickedField = 'userId';
      }

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      if (!aliveRef.current) return;

      setOwnerFieldUsed(pickedField);
      setItems(data);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    } catch (e) {
      if (!aliveRef.current) return;
      setErr(e?.message || 'حدث خطأ في تحميل إعلانات المعلن');
      setLoading(false);
      setHasMore(false);
    }
  }, [userId]);

  useEffect(() => {
    const cancelIdle = scheduleIdleCallback(fetchFirst);
    return () => cancelIdle?.();
  }, [fetchFirst]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    if (!lastDocRef.current) return;

    setLoadingMore(true);
    setErr('');

    try {
      const { db } = await loadFirebaseClient();

      const snap = await db
        .collection('listings')
        .where(ownerFieldUsed, '==', userId)
        .orderBy('createdAt', 'desc')
        .startAfter(lastDocRef.current)
        .limit(PAGE_SIZE)
        .get();

      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((l) => l.isActive !== false && l.hidden !== true);

      if (!aliveRef.current) return;

      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...data.filter((x) => !seen.has(x.id))];
      });

      lastDocRef.current = snap.docs[snap.docs.length - 1] || lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoadingMore(false);
    } catch (e) {
      if (!aliveRef.current) return;
      setErr(e?.message || 'تعذر تحميل المزيد');
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, ownerFieldUsed, userId]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    if (!hasMore || loading || loadingMore) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: '900px 0px', threshold: 0 }
    );

    obs.observe(el);
    return () => {
      try {
        obs.disconnect();
      } catch {}
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((l) => {
      const title = safeText(l.title).toLowerCase();
      const city = safeText(l.city).toLowerCase();
      const desc = safeText(l.description).toLowerCase();
      return title.includes(q) || city.includes(q) || desc.includes(q);
    });
  }, [items, search]);

  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: 18, paddingBottom: 28 }}>
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 1000 }}>إعلانات المعلن</div>
              <div className="muted" style={{ marginTop: 4 }}>
                المعرف: <span style={{ fontWeight: 900 }}>{userId}</span>
              </div>
            </div>

            <Link href="/" className="btn" style={{ textDecoration: 'none' }}>
              ⬅️ الرئيسية
            </Link>
          </div>

          <div style={{ marginTop: 12, position: 'relative' }}>
            <input
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث داخل إعلانات هذا المعلن..."
              style={{ width: '100%', paddingLeft: 14, paddingRight: 40 }}
            />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }}>
              🔍
            </span>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 18, textAlign: 'center' }}>
            جاري التحميل...
          </div>
        ) : err ? (
          <div className="card" style={{ padding: 18, border: '1px solid rgba(220,38,38,0.25)', background: '#fef2f2' }}>
            <div style={{ fontWeight: 1000, color: '#991b1b' }}>حدث خطأ</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {err}
            </div>
            <button className="btn btnPrimary" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 18, textAlign: 'center' }}>
            لا توجد إعلانات لهذا المعلن حالياً.
          </div>
        ) : (
          <>
            <div className="muted" style={{ margin: '8px 0 12px' }}>
              {filtered.length.toLocaleString('ar-YE')} إعلان
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((l) => (
                <ListingMiniCard key={l.id} listing={l} />
              ))}
            </div>

            <div ref={loadMoreRef} style={{ height: 1 }} />

            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              {loadingMore ? (
                <div className="muted" style={{ padding: 10 }}>
                  ...جاري تحميل المزيد
                </div>
              ) : hasMore ? (
                <div className="muted" style={{ padding: 10 }}>
                  انزل لأسفل لتحميل المزيد
                </div>
              ) : (
                <div className="muted" style={{ padding: 10 }}>
                  انتهت النتائج
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { onAuthStateChanged, getRedirectResult, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { auth, db, storage } from '@lib/firebaseClient';
import Header from './Header';
import CategoryBar from './CategoryBar';
import ListingCard from './ListingCard';
import MainMap from './Map/MainMap';
import AuthModal from './Modals/AuthModal';
import AddListingModal from './Modals/AddListingModal';
import ListingDetailsModal from './Modals/ListingDetailsModal';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mansouralbarout@gmail.com';

const DEFAULT_RATES = {
  USD_YER: 2500,
  SAR_YER: 650,
};

async function uploadImages(uid, files) {
  if (!files?.length) return [];
  if (!storage) return [];

  const urls = [];
  for (const file of files) {
    const safeName = (file.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `listings/${uid}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showMap, setShowMap] = useState(false);

  const [openAuth, setOpenAuth] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [activeListing, setActiveListing] = useState(null);

  const [isDark, setIsDark] = useState(false);
  const [rates, setRates] = useState(DEFAULT_RATES);

  useEffect(() => {
    // Dark mode from localStorage
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('dark') : null;
    if (saved === '1') setIsDark(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('dark-mode', isDark);
    try {
      window.localStorage.setItem('dark', isDark ? '1' : '0');
    } catch {}
  }, [isDark]);

  useEffect(() => {
    // Handle Google redirect result (mobile)
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setListings(data);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return listings.filter((x) => {
      if (category !== 'all' && x.category !== category) return false;
      if (!s) return true;
      const hay = `${x.title || ''} ${x.description || ''} ${x.city || ''}`.toLowerCase();
      return hay.includes(s);
    });
  }, [listings, category, search]);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  async function handleCreateListing(form) {
    if (!user) {
      setOpenAuth(true);
      return;
    }

    const imageUrls = await uploadImages(user.uid, form.images);

    await addDoc(collection(db, 'listings'), {
      title: form.title,
      description: form.description,
      category: form.category,
      city: form.city,
      phone: form.phone,
      whatsapp: form.whatsapp,
      price: Number(form.price) || 0,
      currency: form.currency,
      images: imageUrls,
      lat: form.lat ?? null,
      lng: form.lng ?? null,
      auctionEnabled: !!form.auctionEnabled,
      auctionStartPrice: Number(form.auctionStartPrice) || 0,
      createdAt: serverTimestamp(),
      views: 0,
      userId: user.uid,
      userEmail: user.email || null,
    });
  }

  async function openListingDetails(listing) {
    setActiveListing(listing);
    setOpenDetails(true);

    // Increment view count (best-effort)
    try {
      const refDoc = doc(db, 'listings', listing.id);
      await updateDoc(refDoc, { views: increment(1) });
    } catch {}
  }

  return (
    <div className="fade-in">
      <Header
        user={user}
        onLoginClick={() => setOpenAuth(true)}
        onAddClick={() => setOpenAdd(true)}
        onAdminClick={() => {
          if (!isAdmin) {
            alert(`هذه الصفحة للأدمن فقط. تأكد أن بريدك يطابق: ${ADMIN_EMAIL}`);
            return;
          }
          alert('لوحة الإدارة (نسخة أولية) — سيتم تطويرها لاحقاً');
        }}
        isDark={isDark}
        onToggleDark={() => setIsDark((v) => !v)}
      />

      <section className="max-w-6xl mx-auto px-4 py-4">
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
          <h1 className="text-xl sm:text-2xl font-extrabold text-center">
            بيع واشترِ كل شيء في اليمن
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-300 mt-2">
            نسخة Next.js منظمة (خريطة + مزاد + 3 عملات + مشاهدات)
          </p>

          <div className="mt-4">
            <input
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 outline-none"
              placeholder="ابحث عن إعلان..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <CategoryBar value={category} onChange={setCategory} />

          <div className="flex items-center justify-center gap-3 mt-2">
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700"
            >
              {showMap ? 'إخفاء الخريطة' : 'عرض الخريطة'}
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700"
              >
                تسجيل خروج
              </button>
            ) : null}
          </div>
        </div>

        {showMap ? (
          <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <MainMap
              listings={filtered}
              onSelect={(l) => openListingDetails(l)}
            />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="text-center col-span-full text-slate-500">جاري تحميل الإعلانات...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center col-span-full text-slate-500">لا توجد إعلانات حالياً</div>
          ) : (
            filtered.map((l) => (
              <ListingCard key={l.id} listing={l} rates={rates} onClick={openListingDetails} />
            ))
          )}
        </div>

        <div className="mt-10 text-center text-xs text-slate-500">
          ملاحظة: إذا كان تسجيل Google لا يعمل في iPhone/Safari، افتح الموقع في المتصفح العادي (ليس التصفح الخفي)،
          وتأكد أن Firebase Authorized domains تشمل: vercel.app و sooqyemen.com.
        </div>
      </section>

      <AuthModal open={openAuth} onClose={() => setOpenAuth(false)} />

      <AddListingModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={async (form) => {
          await handleCreateListing(form);
          setOpenAdd(false);
        }}
        requireLogin={!user}
      />

      <ListingDetailsModal
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        listing={activeListing}
        rates={rates}
      />
    </div>
  );
}

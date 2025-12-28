'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import Price from '../Price';

export default function ListingDetailsModal({ open, onClose, listing, rates }) {
  const images = listing?.images?.length ? listing.images : ['/placeholder.jpg'];
  const [idx, setIdx] = useState(0);

  const mapLink = useMemo(() => {
    if (!listing?.lat || !listing?.lng) return null;
    return `https://maps.google.com/?q=${listing.lat},${listing.lng}`;
  }, [listing]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="flex items-center justify-between gap-3">
          <div className="font-extrabold text-lg">تفاصيل الإعلان</div>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700">
            إغلاق
          </button>
        </div>

        <div className="mt-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700">
            <Image
              src={images[idx]}
              alt={listing?.title || 'صورة'}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover"
              priority={false}
            />
          </div>

          {images.length > 1 ? (
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setIdx((v) => (v - 1 + images.length) % images.length)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700"
              >
                السابق
              </button>
              <div className="text-sm text-slate-500">
                {idx + 1} / {images.length}
              </div>
              <button
                onClick={() => setIdx((v) => (v + 1) % images.length)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700"
              >
                التالي
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="text-xl font-extrabold">{listing?.title}</div>
          <div className="mt-1 text-sm text-slate-500">{listing?.categoryLabel || listing?.category || ''}</div>

          <div className="mt-3">
            <Price amount={listing?.price} currency={listing?.currency} rates={rates} />
          </div>

          {listing?.description ? (
            <p className="mt-3 whitespace-pre-wrap leading-7">{listing.description}</p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <div className="text-slate-500">المدينة</div>
              <div className="font-bold">{listing?.city || '-'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <div className="text-slate-500">رقم الجوال</div>
              <div className="font-bold">{listing?.phone || '-'}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {listing?.whatsapp === 'yes' && listing?.phone ? (
              <a
                className="px-4 py-3 rounded-2xl bg-green-600 text-white font-extrabold"
                href={`https://wa.me/${String(listing.phone).replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
              >
                واتساب
              </a>
            ) : null}
            {listing?.phone ? (
              <a
                className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-extrabold"
                href={`tel:${listing.phone}`}
              >
                اتصال
              </a>
            ) : null}
            {mapLink ? (
              <a
                className="px-4 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 font-extrabold"
                href={mapLink}
                target="_blank"
                rel="noreferrer"
              >
                فتح الموقع على الخريطة
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

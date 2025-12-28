'use client';

import Image from 'next/image';
import Price from './Price';
import { EyeIcon } from './Icons';

export default function ListingCard({ listing, rates, onClick }) {
  const img = listing?.images?.[0] || '/placeholder.jpg';
  return (
    <button
      type="button"
      onClick={() => onClick?.(listing)}
      className="w-full text-right bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow transition overflow-hidden"
    >
      <div className="relative w-full aspect-[4/3] bg-slate-100 dark:bg-slate-700">
        <Image
          src={img}
          alt={listing?.title || 'إعلان'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="p-3">
        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-lg line-clamp-1">
          {listing?.title || 'بدون عنوان'}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            {listing?.categoryLabel || listing?.category || 'قسم'}
          </span>
          {listing?.city ? (
            <span className="text-xs text-slate-500 dark:text-slate-300">{listing.city}</span>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300">
            <EyeIcon className="w-4 h-4" />
            {listing?.views || 0}
          </span>
        </div>

        <div className="mt-2">
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            <span className="ml-1">{formatMain(listing?.price)}</span>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-300">
              {listing?.currency || 'YER'}
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            <Price amount={listing?.price} currency={listing?.currency} rates={rates} />
          </div>
        </div>
      </div>
    </button>
  );
}

function formatMain(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('ar-YE');
}

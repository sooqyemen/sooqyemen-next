'use client';

export default function AuctionBox({
  enabled,
  onToggle,
  startPrice,
  onStartPriceChange,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-extrabold">تفعيل المزاد</div>
          <div className="text-sm text-slate-500 dark:text-slate-300">
            إذا فعلته، يبدأ المزاد من سعر تحدده.
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={!!enabled}
            onChange={(e) => onToggle?.(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:bg-emerald-600"></div>
          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
        </label>
      </div>

      {enabled ? (
        <div className="mt-3">
          <label className="block text-sm font-bold mb-1">سعر بداية المزاد</label>
          <input
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
            type="number"
            inputMode="numeric"
            value={startPrice || ''}
            onChange={(e) => onStartPriceChange?.(e.target.value)}
            placeholder="مثال: 50000"
          />
        </div>
      ) : null}
    </div>
  );
}

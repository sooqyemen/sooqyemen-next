'use client';

import { useMemo, useState } from 'react';
import LocationPicker from '../Map/LocationPicker';
import AuctionBox from '../AuctionBox';

const CATEGORIES = [
  { id: 'cars', label: 'سيارات' },
  { id: 'realestate', label: 'عقارات' },
  { id: 'phones', label: 'جوالات' },
  { id: 'jobs', label: 'وظائف' },
  { id: 'solar', label: 'طاقة شمسية' },
  { id: 'furniture', label: 'أثاث' },
  { id: 'yemen', label: 'منتجات يمنية' },
  { id: 'services', label: 'خدمات' },
];

export default function AddListingModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'realestate',
    city: '',
    price: '',
    currency: 'YER',
    phone: '',
    whatsapp: 'yes',
    location: { lat: 15.3694, lng: 44.1910 },
    images: [],
    auctionEnabled: false,
    startPrice: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    return form.title.trim().length >= 3 && form.city.trim().length >= 2;
  }, [form.title, form.city]);

  if (!open) return null;

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError('أكمل العنوان والمدينة على الأقل.');
      return;
    }
    try {
      setBusy(true);
      await onSubmit?.(form);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'فشل إضافة الإعلان.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="flex items-center justify-between mb-3">
          <div className="font-extrabold text-lg">إضافة إعلان</div>
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700">إغلاق</button>
        </div>

        {error ? (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">العنوان</label>
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                placeholder="مثال: شقة للبيع"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">الوصف</label>
              <input
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                placeholder="تفاصيل مختصرة"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">القسم</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">المدينة</label>
              <input
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                placeholder="مثال: صنعاء"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">السعر</label>
              <input
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                placeholder="مثال: 150000"
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">العملة</label>
              <select
                value={form.currency}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                <option value="YER">YER</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">رقم الجوال</label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
                placeholder="مثال: 770000000"
                inputMode="tel"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">واتساب</label>
              <select
                value={form.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
              >
                <option value="yes">نعم</option>
                <option value="no">لا</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">اختر موقع الإعلان</label>
            <LocationPicker
              value={form.location}
              onChange={(loc) => update('location', loc)}
            />
            <div className="text-xs text-slate-500 mt-2">اضغط على الخريطة لتحديد الموقع أو استخدم زر "تحديد تلقائي".</div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
            <label className="block text-sm font-bold mb-2">صور (اختياري)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => update('images', Array.from(e.target.files || []))}
              className="w-full"
            />
            <div className="text-xs text-slate-500 mt-2">يمكن رفع حتى 4 صور.</div>
          </div>

          <AuctionBox
            enabled={form.auctionEnabled}
            onToggle={(v) => update('auctionEnabled', v)}
            startPrice={form.startPrice}
            onStartPriceChange={(v) => update('startPrice', v)}
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl py-3 font-extrabold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {busy ? 'جارٍ الإضافة...' : 'تأكيد'}
          </button>
        </form>
      </div>
    </div>
  );
}

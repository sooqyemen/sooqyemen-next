'use client';

export default function ChatModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-lg">الدردشة</div>
          <button onClick={onClose} className="px-3 py-2 rounded-xl border">إغلاق</button>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">الدردشة في هذه النسخة تجريبية (يمكن تطويرها لاحقاً).</p>
      </div>
    </div>
  );
}

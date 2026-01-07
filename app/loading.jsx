// app/loading.jsx
export default function Loading() {
  return (
    <div dir="rtl" className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>
          جاري التحميل...
        </div>
        <div className="muted">
          الرجاء الانتظار قليلاً
        </div>
      </div>
    </div>
  );
}

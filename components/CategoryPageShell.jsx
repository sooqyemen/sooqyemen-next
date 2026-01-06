// components/CategoryPageShell.jsx
export default function CategoryPageShell({ title, description, children }) {
  const safeTitle = typeof title === 'string' ? title : '';
  const safeDesc = typeof description === 'string' ? description : '';

  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: 14, paddingBottom: 24 }}>
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 20, lineHeight: 1.4 }}>
            {safeTitle}
          </div>

          {safeDesc ? (
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              {safeDesc}
            </div>
          ) : null}
        </div>

        {children}
      </div>
    </div>
  );
}

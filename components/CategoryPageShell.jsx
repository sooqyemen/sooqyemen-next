// components/CategoryPageShell.jsx
export default function CategoryPageShell({ title, description, children }) {
  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: 14 }}>
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{title}</div>
          {description ? (
            <div className="muted" style={{ marginTop: 6 }}>
              {description}
            </div>
          ) : null}
        </div>

        {children}
      </div>
    </div>
  );
}

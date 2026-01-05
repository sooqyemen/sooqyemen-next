// /components/CategoryPageShell.jsx
export default function CategoryPageShell({ title, description, children }) {
  return (
    <div dir="rtl" className="container" style={{ paddingTop: 16, paddingBottom: 24 }}>
      <div className="card" style={{ padding: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h1>
        {description ? (
          <p className="muted" style={{ marginTop: 8, marginBottom: 0, lineHeight: 1.7 }}>
            {description}
          </p>
        ) : null}
      </div>

      <div style={{ marginTop: 16 }}>{children}</div>
    </div>
  );
}

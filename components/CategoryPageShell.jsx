// components/CategoryPageShell.jsx
export default function CategoryPageShell({ title, description, children }) {
  return (
    <div dir="rtl">
      <section className="hero-section" aria-label="عنوان القسم">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">{title}</h1>
            {description ? <p className="hero-subtitle">{description}</p> : null}
          </div>
        </div>
      </section>

      <main className="main-content" role="main">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}

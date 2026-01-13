// components/YemenMarketLogo.jsx
export default function YemenMarketLogo({ size = 44, subtitle = true }) {
  const s = Number(size) || 44;

  return (
    <div className="logoWrap" aria-label="سوق اليمن">
      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        className="logoSvg"
        role="img"
        aria-hidden="true"
      >
        {/* حلقات ألوان العلم */}
        <circle cx="50" cy="50" r="45" fill="#CE1126" />
        <circle cx="50" cy="50" r="40" fill="#000000" />
        <circle cx="50" cy="50" r="35" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="30" fill="#009A3E" />

        {/* رمز تجارة مبسط (كوب/منتج) */}
        <path
          d="M35,40 Q50,25 65,40 Q65,55 50,70 Q35,55 35,40 Z"
          fill="#8B4513"
        />
        <path d="M40,45 L60,45 L55,60 L45,60 Z" fill="#654321" />
      </svg>

      <div className="logoText">
        <div className="logoTitle">سوق اليمن</div>
        {subtitle && <div className="logoSub">السوق الشامل</div>}
      </div>

      <style jsx>{`
        .logoWrap {
          display: flex;
          align-items: center;
          gap: 10px;
          direction: rtl;
        }
        .logoSvg {
          filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.18));
          flex: 0 0 auto;
        }
        .logoText {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }
        .logoTitle {
          font-weight: 900;
          font-size: 18px;
          color: #111827;
        }
        .logoSub {
          margin-top: 3px;
          font-size: 12px;
          color: #6b7280;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

// components/SkeletonLoader.jsx
import './SkeletonLoader.css';

export default function SkeletonLoader({ count = 6, type = 'grid' }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'list') {
    return (
      <div className="skeleton-list">
        {items.map((i) => (
          <div key={i} className="skeleton-card skeleton-list-item">
            <div className="skeleton-image skeleton-shimmer"></div>
            <div className="skeleton-content">
              <div className="skeleton-title skeleton-shimmer"></div>
              <div className="skeleton-text skeleton-shimmer"></div>
              <div className="skeleton-text skeleton-shimmer" style={{ width: '60%' }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-grid">
      {items.map((i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image skeleton-shimmer"></div>
          <div className="skeleton-content">
            <div className="skeleton-title skeleton-shimmer"></div>
            <div className="skeleton-text skeleton-shimmer"></div>
            <div className="skeleton-price skeleton-shimmer"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

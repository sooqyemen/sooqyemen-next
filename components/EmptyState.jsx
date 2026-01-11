// components/EmptyState.jsx
import Link from 'next/link';
import './EmptyState.css';

export default function EmptyState({ 
  icon = '📭', 
  title = 'لا توجد نتائج', 
  message = 'لم يتم العثور على أي عناصر.',
  actionText = '➕ أضف إعلان جديد',
  actionUrl = '/add',
  showAction = true,
  type = 'info' // info, error, warning, success
}) {
  return (
    <div className={`empty-state empty-state-${type}`}>
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {showAction && actionUrl && (
        <Link href={actionUrl} className="empty-state-action">
          {actionText}
        </Link>
      )}
    </div>
  );
}

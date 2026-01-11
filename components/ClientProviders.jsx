// components/ClientProviders.jsx
'use client';

import { AuthProvider } from '@/lib/useAuth';
import OfflineIndicator from './OfflineIndicator';

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <OfflineIndicator />
      {children}
    </AuthProvider>
  );
}

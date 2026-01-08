// components/ClientProviders.jsx
'use client';

import { AuthProvider } from '@/lib/useAuth';

export default function ClientProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

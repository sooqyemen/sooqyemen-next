// app/admin/page.js
'use client';

import { useAuth } from '@/lib/useAuth';

const ADMINS = ['mansouralbarout@gmail.com']; // نفس البريد، للاستخدام الداخلي فقط

export default function AdminPage() {
  const { user, signInWithGoogle } = useAuth();

  // لم يسجل الدخول
  if (!user) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          لوحة الإدارة
        </h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          يجب تسجيل الدخول أولاً للوصول إلى لوحة الإدارة.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="btn btn-primary"
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          تسجيل الدخول باستخدام Google
        </button>
      </main>
    );
  }

  const isAdmin = ADMINS.includes(user.email || '');

  // ليس أدمن
  if (!isAdmin) {
    return (
      <main className="container" style={{ paddingTop: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
          لوحة الإدارة
        </h1>
        <p className="muted">
          هذه الصفحة خاصة بالإدارة فقط، ولا يمكن الوصول إليها من الحساب
          الحالي.
        </p>
      </main>
    );
  }

  // هنا تضع محتوى لوحة الإدارة الحقيقي
  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
        لوحة الإدارة
      </h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        مرحباً بك في لوحة إدارة سوق اليمن.
      </p>

      {/* ضع أدوات الإدارة هنا: إدارة الإعلانات، الأقسام، المستخدمين، إلخ */}
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          يمكنك لاحقاً إضافة جداول لإدارة الإعلانات والأقسام من هنا.
        </p>
      </div>
    </main>
  );
}

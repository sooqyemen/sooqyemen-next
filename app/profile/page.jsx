'use client';

import { useAuth } from '@/lib/useAuth';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    bio: ''
  });

  // تحميل بيانات المستخدم
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || 'صنعاء',
        bio: user.bio || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // هنا يمكنك إضافة API call لتحديث البيانات
      console.log('Saving profile data:', formData);
      setEditMode(false);
      // إضافة toast للنجاح لاحقاً
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const stats = {
    listings: 12,
    sold: 8,
    active: 4,
    rating: 4.5,
    joinedDate: 'يناير 2024'
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <p>جاري تحميل بيانات الملف الشخصي...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-not-signed-in">
        <div className="not-signed-in-content">
          <div className="lock-icon">🔒</div>
          <h2>لم تقم بتسجيل الدخول</h2>
          <p>يجب عليك تسجيل الدخول لعرض الملف الشخصي</p>
          <div className="auth-buttons">
            <Link href="/login" className="login-btn">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="register-btn">
              إنشاء حساب جديد
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* رأس الصفحة */}
      <div className="profile-header">
        <div className="profile-banner">
          <div className="banner-overlay">
            <h1>الملف الشخصي</h1>
            <p>إدارة معلوماتك وتفضيلاتك</p>
          </div>
        </div>

        {/* معلومات المستخدم الرئيسية */}
        <div className="profile-main-info">
          <div className="avatar-section">
            <div className="profile-avatar">
              {user.name?.charAt(0) || user.email?.charAt(0) || '👤'}
            </div>
            <div className="avatar-actions">
              <button className="change-avatar-btn" type="button">
                تغيير الصورة
              </button>
              <button className="remove-avatar-btn" type="button">
                إزالة
              </button>
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-name-section">
              {editMode ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="edit-name-input"
                  placeholder="الاسم الكامل"
                />
              ) : (
                <h2>{formData.name || user.email?.split('@')[0]}</h2>
              )}
              <div className="profile-badges">
                <span className="badge verified">
                  ✓ موثق
                </span>
                <span className="badge member">
                  عضو منذ {stats.joinedDate}
                </span>
              </div>
            </div>

            <div className="profile-actions">
              {editMode ? (
                <>
                  <button onClick={handleSave} className="save-btn" type="button">
                    💾 حفظ التغييرات
                  </button>
                  <button onClick={() => setEditMode(false)} className="cancel-btn" type="button">
                    ❌ إلغاء
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)} className="edit-btn" type="button">
                    ✏️ تعديل الملف الشخصي
                  </button>
                  <Link href="/my-listings" className="my-listings-btn">
                    📋 إعلاناتي
                  </Link>
                  <Link href="/my-chats" className="my-chats-btn">
                    💬 محادثاتي
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-number">{stats.listings}</span>
            <span className="stat-label">إعلاناتي</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-number">{stats.sold}</span>
            <span className="stat-label">تم البيع</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <span className="stat-number">{stats.active}</span>
            <span className="stat-label">نشطة حالياً</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <span className="stat-number">{stats.rating}</span>
            <span className="stat-label">التقييم</span>
          </div>
        </div>
      </div>

      {/* تبويبات */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
          type="button"
        >
          ℹ️ المعلومات الشخصية
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          type="button"
        >
          ⚙️ الإعدادات
        </button>
        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
          type="button"
        >
          🔒 الأمان
        </button>
        <button
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
          type="button"
        >
          📊 النشاطات
        </button>
      </div>

      {/* محتوى التبويبات */}
      <div className="tab-content">
        {activeTab === 'info' && (
          <div className="info-tab">
            <h3>المعلومات الشخصية</h3>
            <div className="info-grid">
              <div className="info-field">
                <label>الاسم الكامل</label>
                {editMode ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="أدخل اسمك الكامل"
                  />
                ) : (
                  <p>{formData.name || 'لم يتم إضافة اسم'}</p>
                )}
              </div>
              <div className="info-field">
                <label>البريد الإلكتروني</label>
                <p>{formData.email}</p>
                <span className="email-note">(لا يمكن تغيير البريد الإلكتروني)</span>
              </div>
              <div className="info-field">
                <label>رقم الجوال</label>
                {editMode ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="أدخل رقم جوالك"
                  />
                ) : (
                  <p>{formData.phone || 'لم يتم إضافة رقم جوال'}</p>
                )}
              </div>
              <div className="info-field">
                <label>المدينة</label>
                {editMode ? (
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                  >
                    <option value="صنعاء">صنعاء</option>
                    <option value="عدن">عدن</option>
                    <option value="تعز">تعز</option>
                    <option value="حضرموت">حضرموت</option>
                    <option value="المكلا">المكلا</option>
                    <option value="إب">إب</option>
                    <option value="ذمار">ذمار</option>
                    <option value="الحديدة">الحديدة</option>
                  </select>
                ) : (
                  <p>{formData.city}</p>
                )}
              </div>
              <div className="info-field full-width">
                <label>نبذة عني</label>
                {editMode ? (
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="أخبرنا عن نفسك..."
                    rows="4"
                  />
                ) : (
                  <p>{formData.bio || 'لم يتم إضافة نبذة'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h3>إعدادات الحساب</h3>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <h4>الإشعارات</h4>
                  <p>تحكم في الإشعارات التي تتلقاها</p>
                </div>
                <button className="setting-btn" type="button">
                  إدارة الإشعارات
                </button>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>الخصوصية</h4>
                  <p>إعدادات عرض معلوماتك للآخرين</p>
                </div>
                <button className="setting-btn" type="button">
                  إعدادات الخصوصية
                </button>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>تفضيلات التواصل</h4>
                  <p>كيف يفضل الآخرون التواصل معك</p>
                </div>
                <select className="setting-select">
                  <option value="phone">الهاتف فقط</option>
                  <option value="whatsapp">واتساب فقط</option>
                  <option value="both">الهاتف و الواتساب</option>
                </select>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h4>لغة العرض</h4>
                  <p>اختر لغة واجهة الموقع</p>
                </div>
                <select className="setting-select">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-tab">
            <h3>أمان الحساب</h3>
            <div className="security-list">
              <div className="security-item">
                <div className="security-info">
                  <h4>كلمة المرور</h4>
                  <p>آخر تحديث: قبل 3 أشهر</p>
                </div>
                <button className="security-btn" type="button">
                  تغيير كلمة المرور
                </button>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <h4>الجلسات النشطة</h4>
                  <p>2 جهاز نشط حالياً</p>
                </div>
                <button className="security-btn" type="button">
                  عرض الجلسات
                </button>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <h4>المصادقة الثنائية</h4>
                  <p>غير مفعلة</p>
                </div>
                <button className="security-btn enable" type="button">
                  تفعيل
                </button>
              </div>
              <div className="security-item">
                <div className="security-info">
                  <h4>النشاط المشبوه</h4>
                  <p>لا يوجد نشاط مشبوه</p>
                </div>
                <button className="security-btn" type="button">
                  تقرير الأمان
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-tab">
            <h3>نشاطاتك الأخيرة</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-content">
                  <p>أضفت إعلان "لابتوب ماك بوك برو"</p>
                  <span className="activity-time">منذ ساعتين</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">💰</div>
                <div className="activity-content">
                  <p>تم بيع "آيفون 14 برو"</p>
                  <span className="activity-time">منذ 3 أيام</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">💬</div>
                <div className="activity-content">
                  <p>رديت على رسالة بخصوص "سيارة تويوتا"</p>
                  <span className="activity-time">منذ 5 أيام</span>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">⭐</div>
                <div className="activity-content">
                  <p>تقييم جديد: ★★★★★ "شكراً عملية بيع رائعة"</p>
                  <span className="activity-time">منذ أسبوع</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* قسم روابط سريعة */}
      <div className="quick-links">
        <h3>روابط سريعة</h3>
        <div className="links-grid">
          <Link href="/add" className="quick-link">
            <span className="link-icon">➕</span>
            <span className="link-text">إضافة إعلان جديد</span>
          </Link>
          <Link href="/favorites" className="quick-link">
            <span className="link-icon">❤️</span>
            <span className="link-text">المفضلة</span>
          </Link>
          <Link href="/help" className="quick-link">
            <span className="link-icon">❓</span>
            <span className="link-text">مساعدة ودعم</span>
          </Link>
          <Link href="/privacy" className="quick-link">
            <span className="link-icon">🔒</span>
            <span className="link-text">سياسة الخصوصية</span>
          </Link>
        </div>
      </div>

      <style jsx>{`
        /* تحميل الصفحة */
        .profile-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 20px;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f1f5f9;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .profile-not-signed-in {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 70vh;
          text-align: center;
          padding: 20px;
        }

        .not-signed-in-content {
          max-width: 400px;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        }

        .lock-icon {
          font-size: 60px;
          margin-bottom: 20px;
          opacity: 0.7;
        }

        .not-signed-in-content h2 {
          color: #1e293b;
          margin-bottom: 10px;
          font-size: 24px;
        }

        .not-signed-in-content p {
          color: #64748b;
          margin-bottom: 30px;
        }

        .auth-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .login-btn, .register-btn {
          display: block;
          padding: 14px;
          border-radius: 10px;
          text-decoration: none;
          text-align: center;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .login-btn {
          background: #f8fafc;
          color: #4f46e5;
          border: 2px solid #e2e8f0;
        }

        .login-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .register-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
        }

        .register-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
        }

        /* الصفحة الرئيسية */
        .profile-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        /* رأس الصفحة */
        .profile-header {
          margin-bottom: 30px;
        }

        .profile-banner {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border-radius: 20px 20px 0 0;
          height: 200px;
          position: relative;
          overflow: hidden;
        }

        .banner-overlay {
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px;
          color: white;
        }

        .banner-overlay h1 {
          font-size: 32px;
          margin-bottom: 10px;
          font-weight: 900;
        }

        .banner-overlay p {
          font-size: 16px;
          opacity: 0.9;
        }

        .profile-main-info {
          background: white;
          border-radius: 0 0 20px 20px;
          padding: 30px;
          display: flex;
          gap: 40px;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .profile-avatar {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: white;
          font-weight: bold;
          border: 5px solid white;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .avatar-actions {
          display: flex;
          gap: 10px;
        }

        .change-avatar-btn, .remove-avatar-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .change-avatar-btn {
          background: #4f46e5;
          color: white;
        }

        .change-avatar-btn:hover {
          background: #4338ca;
        }

        .remove-avatar-btn {
          background: #f1f5f9;
          color: #64748b;
        }

        .remove-avatar-btn:hover {
          background: #e2e8f0;
        }

        .profile-info {
          flex: 1;
        }

        .profile-name-section {
          margin-bottom: 20px;
        }

        .profile-name-section h2 {
          font-size: 28px;
          color: #1e293b;
          margin-bottom: 10px;
        }

        .edit-name-input {
          width: 100%;
          padding: 12px;
          font-size: 28px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
          color: #1e293b;
          font-weight: bold;
        }

        .profile-badges {
          display: flex;
          gap: 10px;
        }

        .badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.verified {
          background: #d1fae5;
          color: #065f46;
        }

        .badge.member {
          background: #dbeafe;
          color: #1e40af;
        }

        .profile-actions {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .edit-btn, .save-btn, .cancel-btn, .my-listings-btn, .my-chats-btn {
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          font-size: 14px;
        }

        .edit-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        .edit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
        }

        .save-btn {
          background: #10b981;
          color: white;
        }

        .save-btn:hover {
          background: #059669;
        }

        .cancel-btn {
          background: #f1f5f9;
          color: #64748b;
        }

        .cancel-btn:hover {
          background: #e2e8f0;
        }

        .my-listings-btn {
          background: #f8fafc;
          color: #4f46e5;
          border: 2px solid #e2e8f0;
        }

        .my-listings-btn:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .my-chats-btn {
          background: #fef3c7;
          color: #92400e;
          border: 2px solid #fde68a;
        }

        .my-chats-btn:hover {
          background: #fde68a;
        }

        /* الإحصائيات */
        .profile-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          padding: 25px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
        }

        .stat-icon {
          font-size: 40px;
          width: 60px;
          height: 60px;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 900;
          color: #1e293b;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #64748b;
          margin-top: 5px;
        }

        /* التبويبات */
        .profile-tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          overflow-x: auto;
          padding-bottom: 10px;
        }

        .tab-btn {
          padding: 15px 25px;
          background: #f8fafc;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tab-btn:hover {
          background: #f1f5f9;
          color: #4f46e5;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        /* محتوى التبويبات */
        .tab-content {
          background: white;
          border-radius: 20px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .tab-content h3 {
          color: #1e293b;
          margin-bottom: 25px;
          font-size: 22px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f1f5f9;
        }

        /* تبويب المعلومات */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 25px;
        }

        .info-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-field label {
          font-weight: 600;
          color: #475569;
          font-size: 14px;
        }

        .info-field p {
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          color: #1e293b;
          min-height: 46px;
          display: flex;
          align-items: center;
        }

        .info-field input, .info-field select, .info-field textarea {
          padding: 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
          color: #1e293b;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .info-field input:focus, .info-field select:focus, .info-field textarea:focus {
          outline: none;
          border-color: #4f46e5;
          background: white;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .info-field.full-width {
          grid-column: 1 / -1;
        }

        .info-field textarea {
          resize: vertical;
          min-height: 100px;
        }

        .email-note {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 5px;
        }

        /* تبويب الإعدادات */
        .settings-list, .security-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .setting-item, .security-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          transition: background 0.2s ease;
        }

        .setting-item:hover, .security-item:hover {
          background: #f1f5f9;
        }

        .setting-info h4, .security-info h4 {
          color: #1e293b;
          margin-bottom: 5px;
          font-size: 16px;
        }

        .setting-info p, .security-info p {
          color: #64748b;
          font-size: 14px;
        }

        .setting-btn, .security-btn {
          padding: 10px 20px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          color: #4f46e5;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .setting-btn:hover, .security-btn:hover {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .security-btn.enable {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        .security-btn.enable:hover {
          background: #059669;
        }

        .setting-select {
          padding: 10px 20px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #1e293b;
          font-weight: 600;
          min-width: 150px;
        }

        /* تبويب النشاطات */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 12px;
        }

        .activity-icon {
          font-size: 24px;
          width: 50px;
          height: 50px;
          background: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-content p {
          color: #1e293b;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .activity-time {
          font-size: 12px;
          color: #94a3b8;
        }

        /* الروابط السريعة */
        .quick-links {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .quick-links h3 {
          color: #1e293b;
          margin-bottom: 25px;
          font-size: 22px;
        }

        .links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .quick-link {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          text-decoration: none;
          color: #1e293b;
          transition: all 0.2s ease;
        }

        .quick-link:hover {
          background: #4f46e5;
          color: white;
          transform: translateY(-3px);
        }

        .link-icon {
          font-size: 24px;
        }

        .link-text {
          font-weight: 600;
          font-size: 15px;
        }

        /* تحسينات للجوال */
        @media (max-width: 768px) {
          .profile-page {
            padding: 10px;
          }

          .profile-main-info {
            flex-direction: column;
            text-align: center;
            gap: 20px;
            padding: 20px;
          }

          .profile-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .profile-tabs {
            flex-direction: column;
          }

          .tab-btn {
            justify-content: center;
          }

          .profile-actions {
            justify-content: center;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .setting-item, .security-item {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .links-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .banner-overlay h1 {
            font-size: 24px;
          }

          .profile-name-section h2 {
            font-size: 22px;
          }

          .edit-name-input {
            font-size: 22px;
          }
        }

        @media (max-width: 480px) {
          .profile-stats {
            grid-template-columns: 1fr;
          }

          .links-grid {
            grid-template-columns: 1fr;
          }

          .profile-actions {
            flex-direction: column;
            width: 100%;
          }

          .edit-btn, .save-btn, .cancel-btn, .my-listings-btn, .my-chats-btn {
            width: 100%;
            justify-content: center;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

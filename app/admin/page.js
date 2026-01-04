'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import Link from 'next/link';
import styles from './admin.module.css'; // ← تغيير هنا

// ... (باقي الكود يبقى كما هو حتى return)

return (
  <>
    <Header />

    <div className={styles.container}> {/* ← تغيير هنا */}
      <div className={styles.header}> {/* ← تغيير هنا */}
        <div className={styles.headerLeft}> {/* ← تغيير هنا */}
          <Link className={styles.backButton} href="/"> {/* ← تغيير هنا */}
            ← رجوع للرئيسية
          </Link>
          <h1 className={styles.pageTitle}>لوحة إدارة سوق اليمن</h1> {/* ← تغيير هنا */}
        </div>
        <div className={styles.adminBadge}> {/* ← تغيير هنا */}
          <span className={styles.badgeText}>لوحة الإدارة</span> {/* ← تغيير هنا */}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingOverlay}> {/* ← تغيير هنا */}
          <div className={styles.spinner}></div> {/* ← تغيير هنا */}
          <p>جاري التحميل...</p>
        </div>
      ) : null}

      {/* ... باقي التغييرات مشابهة */}

      <div className={styles.statsGrid}> {/* ← تغيير هنا */}
        <StatCard title="إجمالي الإعلانات" value={loadingStats ? '...' : stats.totalListings} icon="📊" color="#3B82F6" />
        {/* ... */}
      </div>

      <div className={styles.tabs}> {/* ← تغيير هنا */}
        <button
          className={`${styles.tab} ${activeTab === 'listings' ? styles.tabActive : ''}`} {/* ← تغيير هنا */}
          onClick={() => setActiveTab('listings')}
        >
          📋 إدارة الإعلانات
        </button>
        {/* ... */}
      </div>

      {/* ... وهكذا لباقي الفئات */}

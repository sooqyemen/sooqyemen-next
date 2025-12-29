'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

// بطاقة إعلان
const ListingCard = ({ item }) => {
  return (
    <Link href={`/listing/${item.id}`}>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          border: '1px solid #f0f0f0',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '180px',
            background: item.imageUrl ? `url(${item.imageUrl})` : '#f5f5f5',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {item.featured && (
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background:
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              مميز
            </div>
          )}
        </div>

        <div
          style={{
            padding: '16px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#333',
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {item.title}
            </h3>
            {item.rating && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8f9fa',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: '#f59e0b', marginRight: '4px' }}>★</span>
                {item.rating}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '12px',
              fontSize: '14px',
              color: '#666',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            {item.location}
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#1e40af',
                marginBottom: '4px',
              }}
            >
              {item.price}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#666',
              }}
            >
              {item.originalPrice}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

// بطاقة فئة
const CategoryCard = ({ category }) => {
  return (
    <Link href={`/category/${category.id}`}>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px 16px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #f5f5f5',
          transition: 'all 0.3s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            background: category.color,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          {category.icon}
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '4px',
          }}
        >
          {category.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#666',
            lineHeight: 1.4,
          }}
        >
          {category.count} إعلان
        </p>
      </div>
    </Link>
  );
};

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('كل المدن');
  const [selectedCategory, setSelectedCategory] = useState('جميع الفئات');

  const categories = [
    { id: 1, title: 'سيارات', icon: '🚗', color: '#e0f2fe', count: 245 },
    { id: 2, title: 'عقارات', icon: '🏠', color: '#f0fdf4', count: 189 },
    { id: 3, title: 'أجهزة', icon: '💻', color: '#fef3c7', count: 156 },
    { id: 4, title: 'وظائف', icon: '💼', color: '#fef7cd', count: 89 },
    { id: 5, title: 'طاقة شمسية', icon: '☀️', color: '#ffedd5', count: 67 },
    { id: 6, title: 'أثاث', icon: '🛋️', color: '#fce7f3', count: 134 },
    { id: 7, title: 'دراجات', icon: '🚲', color: '#f0fdfa', count: 78 },
    { id: 8, title: 'مستلزمات', icon: '📱', color: '#f5f3ff', count: 210 },
  ];

  const cities = [
    'كل المدن',
    'صنعاء',
    'عدن',
    'تعز',
    'المكلا',
    'الحديدة',
    'إب',
    'مأرب',
    'شبوة',
  ];

  const listings = [
    {
      id: 1,
      title: 'للبيع في المكلا',
      location: 'المكلا',
      price: '14,118 ي.ي',
      originalPrice: '$3,676',
      rating: 4.5,
      featured: true,
      category: 'سيارات',
    },
    {
      id: 2,
      title: 'أجهزة كمبيوتر',
      location: 'صنعاء',
      price: '1,882 ي.ي',
      originalPrice: '$490',
      rating: 4.2,
      featured: false,
      category: 'أجهزة',
    },
    {
      id: 3,
      title: 'دراجة نارية للبيع',
      location: 'عدن',
      price: '412 ي.ي',
      originalPrice: '$107',
      rating: 4.8,
      featured: true,
      category: 'دراجات',
    },
    {
      id: 4,
      title: 'عقار للبيع',
      location: 'تعز',
      price: '4,000,000 ي.ي',
      originalPrice: '$1,041',
      rating: 4.0,
      featured: false,
      category: 'عقارات',
    },
    {
      id: 5,
      title: 'للبيع حراثة',
      location: 'مأرب',
      price: '2,000,000 ي.ي',
      originalPrice: '$521',
      rating: 4.3,
      featured: true,
      category: 'سيارات',
    },
    {
      id: 6,
      title: 'بطاريات ليثيوم 5 كيلو',
      location: 'الحديدة',
      price: '500 ي.ي',
      originalPrice: '$130',
      rating: 4.7,
      featured: false,
      category: 'طاقة شمسية',
    },
    {
      id: 7,
      title: 'طاقة شمسية اقتصادية',
      location: 'إب',
      price: '1,200 ي.ي',
      originalPrice: '$312',
      rating: 4.9,
      featured: true,
      category: 'طاقة شمسية',
    },
    {
      id: 8,
      title: 'وظيفة مبرمج',
      location: 'صنعاء',
      price: '800 ي.ي',
      originalPrice: '$208',
      rating: 4.1,
      featured: false,
      category: 'وظائف',
    },
  ];

  // (هنا ضع نفس الهيرو والفئات والإعلانات والفوتر اللي عندك – أو أقدر أكملها لك لو حاب)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header />
      {/* بقية تصميم الصفحة اللي عندك */}
    </div>
  );
}

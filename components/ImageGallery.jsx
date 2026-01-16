'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

export default function ImageGallery({ images = [], alt = 'صورة الإعلان' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef(null);

  // إذا لم توجد صور
  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-100 rounded-lg text-slate-400">
        <span className="text-4xl mb-2">📷</span>
        <p>لا توجد صور</p>
      </div>
    );
  }

  // دالة للتعامل مع السكرول وتحديث العداد
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      // حساب رقم الصورة الحالية بناءً على الموقع
      const newIndex = Math.round(scrollLeft / width);
      setActiveIndex(newIndex);
    }
  };

  // دالة للانتقال لصورة معينة عند الضغط على المصغرات
  const scrollToImage = (index) => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
      setActiveIndex(index);
    }
  };

  // دالة للانتقال للصورة التالية/السابقة
  const scrollNav = (direction) => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.offsetWidth;
      const newIndex = direction === 'next' ? activeIndex + 1 : activeIndex - 1;
      
      if (newIndex >= 0 && newIndex < images.length) {
        scrollToImage(newIndex);
      }
    }
  };

  return (
    <div className="w-full select-none" style={{ direction: 'ltr' }}>
      
      {/* 1. السلايدر الرئيسي */}
      <div className="relative group rounded-xl overflow-hidden bg-black border border-slate-200">
        
        {/* الحاوية القابلة للسحب (Scroll Container) */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((img, index) => (
            <div 
              key={index} 
              className="w-full flex-shrink-0 snap-center relative h-[300px] md:h-[400px] flex items-center justify-center bg-black cursor-pointer"
              onClick={() => setIsFullscreen(true)}
            >
              <Image
                src={img}
                alt={`${alt} - ${index + 1}`}
                fill
                className="object-contain"
                priority={index === 0}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* عداد الصور */}
        <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full z-10 backdrop-blur-sm">
          {activeIndex + 1} / {images.length}
        </div>

        {/* أزرار التنقل (تظهر في الشاشات الكبيرة) */}
        {images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); scrollNav('prev'); }}
              className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white w-9 h-9 rounded-full flex items-center justify-center transition backdrop-blur-sm z-10 ${activeIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              ❮
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); scrollNav('next'); }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white w-9 h-9 rounded-full flex items-center justify-center transition backdrop-blur-sm z-10 ${activeIndex === images.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
              ❯
            </button>
          </>
        )}
      </div>

      {/* 2. شريط المصغرات (Thumbnails) */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide px-1">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => scrollToImage(index)}
              className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                activeIndex === index ? 'border-blue-600 opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={img}
                alt={`مصغرة ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* 3. نافذة ملء الشاشة (Lightbox) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col animate-fade-in">
          {/* زر الإغلاق */}
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center"
          >
            ✕
          </button>

          {/* الصورة الكبيرة */}
          <div className="flex-1 flex items-center justify-center p-2 relative w-full h-full">
            <div className="relative w-full h-full max-w-5xl max-h-[85vh]">
              <Image
                src={images[activeIndex]}
                alt="Full View"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* شريط تنقل سفلي في وضع ملء الشاشة */}
          <div className="h-20 bg-black/50 flex items-center justify-center gap-4 pb-4">
             <button onClick={() => scrollNav('prev')} className="text-white text-3xl p-4 disabled:opacity-30" disabled={activeIndex === 0}>❮</button>
             <span className="text-white font-bold">{activeIndex + 1} / {images.length}</span>
             <button onClick={() => scrollNav('next')} className="text-white text-3xl p-4 disabled:opacity-30" disabled={activeIndex === images.length - 1}>❯</button>
          </div>
        </div>
      )}

      <style jsx>{`
        /* إخفاء شريط التمرير للمتصفحات المختلفة */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

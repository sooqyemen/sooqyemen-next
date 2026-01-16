'use client';

import { useState } from 'react';
import Image from 'next/image';

// استيراد مكونات Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation, Thumbs, Zoom, Pagination } from 'swiper/modules';

// استيراد أنماط Swiper الضرورية
import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import 'swiper/css/zoom';
import 'swiper/css/pagination';

export default function ImageGallery({ images = [], alt = 'صورة الإعلان' }) {
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);

  // التعامل مع حالة عدم وجود صور
  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-100 rounded-lg text-slate-400">
        <span className="text-4xl mb-2">📷</span>
        <p>لا توجد صور</p>
      </div>
    );
  }

  // فتح وضع ملء الشاشة عند النقر
  const handleImageClick = (index) => {
    setFullScreenIndex(index);
    setIsFullscreen(true);
  };

  return (
    <div className="gallery-container">
      
      {/* 1. السلايدر الرئيسي */}
      <div className="main-slider-wrapper">
        <Swiper
          style={{
            '--swiper-navigation-color': '#fff',
            '--swiper-pagination-color': '#fff',
          }}
          spaceBetween={10}
          navigation={true}
          thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
          modules={[FreeMode, Navigation, Thumbs]}
          className="mySwiper2 rounded-xl overflow-hidden bg-black"
        >
          {images.map((img, index) => (
            <SwiperSlide key={index}>
              <div 
                className="relative w-full h-[300px] md:h-[400px] cursor-pointer group"
                onClick={() => handleImageClick(index)}
              >
                <Image
                  src={img}
                  alt={`${alt} - ${index + 1}`}
                  fill
                  className="object-contain"
                  priority={index === 0}
                />
                {/* أيقونة التكبير تظهر عند التحويم */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-white text-4xl drop-shadow-lg">⛶</span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* 2. شريط المصغرات (يظهر فقط إذا كان هناك أكثر من صورة) */}
      {images.length > 1 && (
        <Swiper
          onSwiper={setThumbsSwiper}
          spaceBetween={10}
          slidesPerView={4}
          freeMode={true}
          watchSlidesProgress={true}
          modules={[FreeMode, Navigation, Thumbs]}
          className="thumbs-slider mt-2"
          breakpoints={{
            320: { slidesPerView: 3, spaceBetween: 5 },
            640: { slidesPerView: 4, spaceBetween: 10 },
            1024: { slidesPerView: 5, spaceBetween: 10 },
          }}
        >
          {images.map((img, index) => (
            <SwiperSlide key={index} className="cursor-pointer rounded-md overflow-hidden opacity-60 hover:opacity-100 transition-opacity thumb-slide">
              <div className="relative w-full h-20 bg-slate-100">
                <Image
                  src={img}
                  alt={`مصغرة ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* 3. نافذة ملء الشاشة (Modal) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm animate-fade-in">
          {/* زر الإغلاق */}
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-[10000] text-white bg-white/10 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-all"
          >
            ✕
          </button>

          <div className="w-full h-full max-w-7xl mx-auto p-4 flex items-center">
            <Swiper
              initialSlide={fullScreenIndex}
              spaceBetween={30}
              navigation={true}
              pagination={{
                type: 'fraction',
              }}
              zoom={true} // تفعيل التكبير
              modules={[Navigation, Zoom, Pagination]}
              className="w-full h-full fullscreen-swiper"
              style={{
                '--swiper-navigation-color': '#fff',
                '--swiper-pagination-color': '#fff',
              }}
            >
              {images.map((img, index) => (
                <SwiperSlide key={index} className="flex items-center justify-center">
                  <div className="swiper-zoom-container">
                    <Image
                      src={img}
                      alt={`Full ${index}`}
                      width={1920}
                      height={1080}
                      className="max-h-screen w-auto object-contain"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}

      {/* تنسيقات إضافية مخصصة لـ Swiper */}
      <style jsx global>{`
        .thumb-slide.swiper-slide-thumb-active {
          opacity: 1;
          border: 2px solid #3b82f6; /* لون أزرق للإطار النشط */
        }
        
        /* تحسين شكل أسهم التنقل */
        .swiper-button-next, .swiper-button-prev {
          background-color: rgba(0,0,0,0.3);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: white !important;
        }
        .swiper-button-next:after, .swiper-button-prev:after {
          font-size: 18px !important;
          font-weight: bold;
        }
        
        .gallery-container {
          direction: ltr; /* Swiper يعمل بشكل أفضل LTR، ولكن يمكن تعديله */
        }

        /* أنيميشن بسيط للظهور */
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

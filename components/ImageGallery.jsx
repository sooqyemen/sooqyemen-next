'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function ImageGallery({ images = [], alt = 'صورة الإعلان' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const galleryRef = useRef(null);

  // If no images provided, show placeholder
  if (!images || images.length === 0) {
    return (
      <div className="image-gallery-placeholder" role="img" aria-label="لا توجد صور متاحة">
        <span className="placeholder-icon" aria-hidden="true">🖼️</span>
        <p className="placeholder-text">لا توجد صور</p>
      </div>
    );
  }

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        goToNext();
      } else if (e.key === 'ArrowRight') {
        goToPrevious();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen, currentIndex]);

  const currentImage = images[currentIndex];

  return (
    <>
      <div className="image-gallery" ref={galleryRef}>
        {/* Main Image Display */}
        <div
          className="gallery-main"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          role="region"
          aria-label="معرض الصور"
          aria-live="polite"
        >
          <div className="main-image-container">
            <Image
              src={currentImage}
              alt={`${alt} - صورة ${currentIndex + 1} من ${images.length}`}
              width={800}
              height={600}
              priority={currentIndex === 0}
              loading={currentIndex === 0 ? 'eager' : 'lazy'}
              className="main-image"
              onClick={() => setIsFullscreen(true)}
              style={{ cursor: 'pointer' }}
            />
            
            {/* Image Counter */}
            <div className="image-counter" aria-live="polite">
              <span>{currentIndex + 1}</span>
              <span>/</span>
              <span>{images.length}</span>
            </div>

            {/* Fullscreen Button */}
            <button
              className="fullscreen-btn"
              onClick={() => setIsFullscreen(true)}
              aria-label="عرض بملء الشاشة"
              type="button"
            >
              <span aria-hidden="true">⛶</span>
            </button>
          </div>

          {/* Navigation Buttons for Desktop */}
          {images.length > 1 && (
            <>
              <button
                className="nav-btn nav-btn-prev"
                onClick={goToPrevious}
                aria-label="الصورة السابقة"
                type="button"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button
                className="nav-btn nav-btn-next"
                onClick={goToNext}
                aria-label="الصورة التالية"
                type="button"
              >
                <span aria-hidden="true">›</span>
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="gallery-thumbnails" role="tablist" aria-label="اختيار الصورة">
            {images.map((img, index) => (
              <button
                key={index}
                className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToImage(index)}
                aria-label={`عرض الصورة ${index + 1}`}
                aria-selected={index === currentIndex}
                role="tab"
                type="button"
              >
                <Image
                  src={img}
                  alt={`صورة مصغرة ${index + 1}`}
                  width={100}
                  height={100}
                  className="thumbnail-image"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fullscreen-modal"
          onClick={() => setIsFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة بملء الشاشة"
        >
          <button
            className="close-fullscreen"
            onClick={() => setIsFullscreen(false)}
            aria-label="إغلاق العرض بملء الشاشة"
            type="button"
          >
            <span aria-hidden="true">✕</span>
          </button>

          <div
            className="fullscreen-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image
              src={currentImage}
              alt={`${alt} - صورة ${currentIndex + 1}`}
              width={1920}
              height={1080}
              className="fullscreen-image"
              priority
            />

            {images.length > 1 && (
              <>
                <button
                  className="nav-btn nav-btn-prev fullscreen-nav"
                  onClick={goToPrevious}
                  aria-label="الصورة السابقة"
                  type="button"
                >
                  <span aria-hidden="true">‹</span>
                </button>
                <button
                  className="nav-btn nav-btn-next fullscreen-nav"
                  onClick={goToNext}
                  aria-label="الصورة التالية"
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                </button>
              </>
            )}

            <div className="fullscreen-counter" aria-live="polite">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .image-gallery {
          width: 100%;
          background: #f8fafc;
          border-radius: 12px;
          overflow: hidden;
        }

        .image-gallery-placeholder {
          width: 100%;
          height: 400px;
          background: #f1f5f9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .placeholder-icon {
          font-size: 4rem;
          color: #94a3b8;
          margin-bottom: 1rem;
        }

        .placeholder-text {
          color: #64748b;
          font-size: 1rem;
        }

        .gallery-main {
          position: relative;
          width: 100%;
          background: #000;
          touch-action: pan-y;
        }

        .main-image-container {
          position: relative;
          width: 100%;
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }

        .main-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .image-counter {
          position: absolute;
          top: 1rem;
          left: 1rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          gap: 0.25rem;
          z-index: 2;
        }

        .fullscreen-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.25rem;
          transition: all 0.2s ease;
          z-index: 2;
        }

        .fullscreen-btn:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: scale(1.1);
        }

        .fullscreen-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 2rem;
          font-weight: 300;
          transition: all 0.2s ease;
          z-index: 2;
          opacity: 0;
        }

        .gallery-main:hover .nav-btn {
          opacity: 1;
        }

        .nav-btn:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: translateY(-50%) scale(1.1);
        }

        .nav-btn:focus {
          opacity: 1;
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .nav-btn-prev {
          right: 1rem;
        }

        .nav-btn-next {
          left: 1rem;
        }

        .gallery-thumbnails {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 #f1f5f9;
        }

        .gallery-thumbnails::-webkit-scrollbar {
          height: 6px;
        }

        .gallery-thumbnails::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .gallery-thumbnails::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .gallery-thumbnails::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .thumbnail {
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          border: 3px solid transparent;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f1f5f9;
          padding: 0;
        }

        .thumbnail:hover {
          border-color: #3b82f6;
          transform: scale(1.05);
        }

        .thumbnail:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .thumbnail.active {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .thumbnail-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .fullscreen-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .close-fullscreen {
          position: fixed;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.5rem;
          transition: all 0.2s ease;
          z-index: 10001;
          backdrop-filter: blur(10px);
        }

        .close-fullscreen:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .close-fullscreen:focus {
          outline: 2px solid white;
          outline-offset: 2px;
        }

        .fullscreen-content {
          position: relative;
          width: 90vw;
          height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fullscreen-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .fullscreen-nav {
          opacity: 0.7;
        }

        .fullscreen-nav:hover {
          opacity: 1;
        }

        .fullscreen-counter {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 25px;
          font-size: 1rem;
          font-weight: 600;
          backdrop-filter: blur(10px);
          z-index: 10001;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .main-image-container {
            height: 350px;
          }

          .nav-btn {
            opacity: 0.7;
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .gallery-main:hover .nav-btn {
            opacity: 0.7;
          }

          .thumbnail {
            width: 60px;
            height: 60px;
          }

          .fullscreen-content {
            width: 100vw;
            height: 100vh;
          }
        }

        /* Accessibility - Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .nav-btn,
          .thumbnail,
          .fullscreen-btn,
          .close-fullscreen {
            transition: none;
          }

          .fullscreen-modal {
            animation: none;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .nav-btn,
          .fullscreen-btn,
          .close-fullscreen {
            border: 2px solid white;
          }

          .thumbnail.active {
            border-width: 4px;
          }
        }
      `}</style>
    </>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';

export default function ImageGallery({ images = [], alt = 'صورة الإعلان' }) {
  const imgs = useMemo(() => {
    if (!Array.isArray(images)) return [];
    return images.map((x) => String(x || '').trim()).filter(Boolean);
  }, [images]);

  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // حافظ على index داخل النطاق عند تغير الصور
  useEffect(() => {
    if (!imgs.length) return;
    setIndex((prev) => Math.max(0, Math.min(prev, imgs.length - 1)));
  }, [imgs.length]);

  const clampIndex = (i) => {
    const n = imgs.length;
    if (!n) return 0;
    return (i % n + n) % n;
  };

  const go = (delta) => setIndex((prev) => clampIndex(prev + delta));

  const openFullscreen = (i) => {
    setIndex(clampIndex(i));
    setZoom(1);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setZoom(1);
  };

  const zoomIn = () => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100));
  const zoomOut = () => setZoom((z) => Math.max(1, Math.round((z - 0.25) * 100) / 100));

  // تحكم بالكيبورد في وضع ملء الشاشة
  useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeFullscreen();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, imgs.length]);

  if (!imgs.length) {
    return (
      <div className="empty">
        <div className="emptyIcon">📷</div>
        <div className="emptyText">لا توجد صور</div>

        <style jsx>{`
          .empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 260px;
            background: #f1f5f9;
            border-radius: 12px;
            color: #64748b;
          }
          .emptyIcon {
            font-size: 40px;
            margin-bottom: 8px;
          }
          .emptyText {
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  const current = imgs[index];

  return (
    <div className="gallery">
      {/* الصورة الرئيسية */}
      <div className="mainWrap">
        <button
          type="button"
          className="navBtn prev"
          onClick={() => go(-1)}
          aria-label="السابق"
          disabled={imgs.length <= 1}
        >
          ‹
        </button>

        <button
          type="button"
          className="navBtn next"
          onClick={() => go(1)}
          aria-label="التالي"
          disabled={imgs.length <= 1}
        >
          ›
        </button>

        <div
          className="mainFrame"
          role="button"
          tabIndex={0}
          onClick={() => openFullscreen(index)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openFullscreen(index);
          }}
          aria-label="فتح الصورة بحجم كامل"
        >
          <img
            src={current}
            alt={`${alt} - ${index + 1}`}
            className="mainImg"
            loading="eager"
            decoding="async"
          />

          <div className="hint">
            ⛶
            <span>تكبير</span>
          </div>
        </div>
      </div>

      {/* المصغرات */}
      {imgs.length > 1 && (
        <div className="thumbs" role="list">
          {imgs.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={`thumb ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`عرض الصورة ${i + 1}`}
            >
              <img src={src} alt={`مصغرة ${i + 1}`} className="thumbImg" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {/* ملء الشاشة */}
      {isFullscreen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            // إغلاق عند الضغط على الخلفية فقط
            if (e.target === e.currentTarget) closeFullscreen();
          }}
        >
          <button type="button" className="close" onClick={closeFullscreen} aria-label="إغلاق">
            ✕
          </button>

          <div className="toolbar">
            <button type="button" className="toolBtn" onClick={zoomOut} aria-label="تصغير" disabled={zoom <= 1}>
              −
            </button>
            <div className="zoomVal">{Math.round(zoom * 100)}%</div>
            <button type="button" className="toolBtn" onClick={zoomIn} aria-label="تكبير" disabled={zoom >= 3}>
              +
            </button>
          </div>

          <button
            type="button"
            className="navBtnModal prev"
            onClick={() => go(-1)}
            aria-label="السابق"
            disabled={imgs.length <= 1}
          >
            ‹
          </button>

          <button
            type="button"
            className="navBtnModal next"
            onClick={() => go(1)}
            aria-label="التالي"
            disabled={imgs.length <= 1}
          >
            ›
          </button>

          <div className="modalFrame">
            <img
              src={current}
              alt={`${alt} - ${index + 1}`}
              className="modalImg"
              style={{ transform: `scale(${zoom})` }}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .gallery {
          direction: rtl;
        }

        .mainWrap {
          position: relative;
        }

        /* إطار ثابت للصورة الرئيسية (مهم للتساوي) */
        .mainFrame {
          position: relative;
          width: 100%;
          height: 360px;
          border-radius: 14px;
          overflow: hidden;
          background: #0b1220;
          cursor: zoom-in;
          user-select: none;
        }

        @media (max-width: 768px) {
          .mainFrame {
            height: 300px;
          }
        }

        .mainImg {
          width: 100%;
          height: 100%;
          object-fit: cover; /* مهم: يمنع الطول/العرض يكسّر التصميم */
          display: block;
        }

        .hint {
          position: absolute;
          inset: auto 12px 12px auto;
          background: rgba(0, 0, 0, 0.35);
          color: #fff;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          opacity: 0;
          transform: translateY(6px);
          transition: all 0.2s ease;
          backdrop-filter: blur(6px);
        }

        .mainFrame:hover .hint {
          opacity: 1;
          transform: translateY(0);
        }

        .hint span {
          font-size: 12px;
        }

        .navBtn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.35);
          color: #fff;
          font-size: 22px;
          cursor: pointer;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .navBtn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .navBtn.prev {
          left: 10px;
        }
        .navBtn.next {
          right: 10px;
        }

        /* المصغرات */
        .thumbs {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 6px;
        }
        .thumb {
          border: 2px solid transparent;
          padding: 0;
          background: transparent;
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          flex: 0 0 auto;
          width: 90px;
          height: 66px;
          opacity: 0.7;
          transition: opacity 0.15s ease, border-color 0.15s ease;
        }
        .thumb:hover {
          opacity: 1;
        }
        .thumb.active {
          opacity: 1;
          border-color: #2563eb;
        }
        .thumbImg {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Modal */
        .modal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
        }

        .close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
        }

        .toolbar {
          position: absolute;
          top: 14px;
          left: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          padding: 8px 10px;
          border-radius: 12px;
        }

        .toolBtn {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 18px;
          cursor: pointer;
        }
        .toolBtn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .zoomVal {
          color: #fff;
          font-size: 13px;
          min-width: 52px;
          text-align: center;
        }

        .modalFrame {
          width: min(1200px, 96vw);
          height: min(86vh, 860px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .modalImg {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transform-origin: center center;
          transition: transform 0.12s ease;
        }

        .navBtnModal {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          border: none;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          font-size: 26px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .navBtnModal:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .navBtnModal.prev {
          left: 14px;
        }
        .navBtnModal.next {
          right: 14px;
        }
      `}</style>
    </div>
  );
}

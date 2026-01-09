'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { useEffect } from 'react';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Log metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${metric.name}:`, metric.value);
    }
    
    // You can send to analytics service here
    // Example: sendToAnalytics(metric);
    
    // Check if metrics are within acceptable thresholds
    const thresholds = {
      CLS: 0.1,
      FID: 100,
      FCP: 1800,
      LCP: 2500,
      TTFB: 800,
      INP: 200,
    };
    
    if (metric.value > thresholds[metric.name]) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ ${metric.name} exceeded threshold: ${metric.value} > ${thresholds[metric.name]}`);
      }
    }
  });
  
  // Register service worker in production
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration.scope);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);
  
  return null;
}

'use client';

import { useReportWebVitals } from 'next/web-vitals';

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
  
  return null;
}

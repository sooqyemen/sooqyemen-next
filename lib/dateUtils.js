// lib/dateUtils.js

/**
 * Format a date/timestamp to Arabic locale format
 * @param {number|Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatArabicDateTime(date) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString('ar-YE', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });
  } catch (e) {
    return '—';
  }
}

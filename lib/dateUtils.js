// lib/dateUtils.js

/**
 * Format a date/timestamp to Arabic locale format
 * @param {number|Date|string} date - Date to format (timestamp, Date object, or ISO string)
 * @returns {string} Formatted date string in Arabic locale
 */
export function formatArabicDateTime(date) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return '—';
    }
    return dateObj.toLocaleString('ar-YE', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });
  } catch (e) {
    console.warn('formatArabicDateTime: Invalid date provided', e);
    return '—';
  }
}

/**
 * Get minimum datetime-local value (current time + delay)
 * @param {number} delayMs - Minimum delay in milliseconds
 * @returns {string} ISO datetime string formatted for datetime-local input
 */
export function getMinDateTimeLocal(delayMs = 60000) {
  return new Date(Date.now() + delayMs).toISOString().slice(0, 16);
}


/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
  return 'LKR ' + new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date to a localized string
 */
export function formatDate(date: Date | string, locale = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

/**
 * Truncate a string to the specified length
 */
export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}
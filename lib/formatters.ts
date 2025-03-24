/**
 * Utility functions for formatting values in the UI
 */

/**
 * Format a number as currency with compact notation for large values
 * e.g. $1,234.56, $1.2K, $1.2M, etc.
 */
export function formatCurrencyCompact(value: number): string {
  if (isNaN(value)) return '$0';
  
  // For small numbers, use standard currency formatting
  if (Math.abs(value) < 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  // For large numbers, use compact notation
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * Format a number with compact notation for large values
 * e.g. 1,234, 1.2K, 1.2M, etc.
 */
export function formatNumberCompact(value: number): string {
  if (isNaN(value)) return '0';
  
  // For small numbers, use standard number formatting
  if (Math.abs(value) < 1000) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
  
  // For large numbers, use compact notation
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * Format a percentage value
 * e.g. 12.3%
 */
export function formatPercentage(value: number, fractionDigits: number = 1): string {
  if (isNaN(value)) return '0%';
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value / 100);
} 
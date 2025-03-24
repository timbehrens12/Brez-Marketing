/**
 * Utility functions for formatting numbers, currencies, and percentages
 */

/**
 * Format a number with commas as thousands separators
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
} 
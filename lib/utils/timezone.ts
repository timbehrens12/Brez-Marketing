/**
 * Utility functions for handling timezone conversions consistently
 * across the application to ensure data resets at midnight local time
 */

/**
 * Gets the current local date as a string in YYYY-MM-DD format
 * This ensures we get the user's local date, not UTC
 */
export function getCurrentLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets yesterday's local date as a string in YYYY-MM-DD format
 * This ensures we get the user's local yesterday, not UTC
 */
export function getYesterdayLocalDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a date to local date string (YYYY-MM-DD) format
 * This ensures we get the date as it appears in the user's timezone
 */
export function dateToLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string as local midnight (not UTC midnight)
 * This is the same approach used in the working CampaignWidget
 */
export function parseAsLocalMidnight(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

/**
 * Checks if a date string represents today in the user's local timezone
 */
export function isLocalToday(dateStr: string): boolean {
  const todayStr = getCurrentLocalDateString();
  return dateStr === todayStr;
}

/**
 * Checks if a date string represents yesterday in the user's local timezone
 */
export function isLocalYesterday(dateStr: string): boolean {
  const yesterdayStr = getYesterdayLocalDateString();
  return dateStr === yesterdayStr;
}

/**
 * Checks if a date range represents "today" in the user's local timezone
 */
export function isDateRangeToday(fromDate: Date, toDate: Date): boolean {
  const fromStr = dateToLocalDateString(fromDate);
  const toStr = dateToLocalDateString(toDate);
  const todayStr = getCurrentLocalDateString();
  return fromStr === todayStr && toStr === todayStr;
}

/**
 * Checks if a date range represents "yesterday" in the user's local timezone
 */
export function isDateRangeYesterday(fromDate: Date, toDate: Date): boolean {
  const fromStr = dateToLocalDateString(fromDate);
  const toStr = dateToLocalDateString(toDate);
  const yesterdayStr = getYesterdayLocalDateString();
  return fromStr === yesterdayStr && toStr === yesterdayStr;
}

/**
 * Creates URL search params for API calls with proper local date handling
 */
export function createDateRangeParams(fromDate: Date, toDate: Date): URLSearchParams {
  const params = new URLSearchParams();
  
  // Always use local date strings, not UTC
  const fromStr = dateToLocalDateString(fromDate);
  const toStr = dateToLocalDateString(toDate);
  
  params.append('from', fromStr);
  params.append('to', toStr);
  
  // Add preset flags for special handling
  if (isDateRangeToday(fromDate, toDate)) {
    params.append('preset', 'today');
  } else if (isDateRangeYesterday(fromDate, toDate)) {
    params.append('preset', 'yesterday');
  }
  
  return params;
}

/**
 * Formats a date range for API calls with proper local date handling
 * Returns an object with formatted dates and preset information
 */
export function formatDateRangeForAPI(fromDate: Date, toDate: Date): {
  from: string;
  to: string;
  preset?: 'today' | 'yesterday';
  isToday: boolean;
  isYesterday: boolean;
} {
  const fromStr = dateToLocalDateString(fromDate);
  const toStr = dateToLocalDateString(toDate);
  
  const isToday = isDateRangeToday(fromDate, toDate);
  const isYesterday = isDateRangeYesterday(fromDate, toDate);
  
  const result: any = {
    from: fromStr,
    to: toStr,
    isToday,
    isYesterday
  };
  
  if (isToday) {
    result.preset = 'today';
  } else if (isYesterday) {
    result.preset = 'yesterday';
  }
  
  return result;
}

/**
 * Helper function to replace the problematic toISOString().split('T')[0] pattern
 * This ensures consistent local date formatting across the codebase
 * 
 * @deprecated Use dateToLocalDateString() instead for Date objects, or getCurrentLocalDateString() for current date
 */
export function formatDateForAPI(date: Date): string {
  return dateToLocalDateString(date);
} 
import { format, isValid, isFuture, isAfter, isBefore, isEqual, startOfDay, endOfDay } from 'date-fns';

/**
 * Validates and normalizes a date string or Date object
 * - Ensures dates are valid
 * - Handles future dates (replaces with current date)
 * - Returns a formatted date string (YYYY-MM-DD)
 */
export function normalizeDateForApi(dateInput: string | Date | null | undefined): string {
  if (!dateInput) {
    return format(new Date(), 'yyyy-MM-dd');
  }
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if the date is valid
    if (!isValid(date)) {
      console.warn('Invalid date provided:', dateInput);
      return format(new Date(), 'yyyy-MM-dd');
    }
    
    // Replace future dates with current date
    if (isFuture(date)) {
      console.warn('Future date detected and normalized:', dateInput);
      return format(new Date(), 'yyyy-MM-dd');
    }
    
    // Format as YYYY-MM-DD
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error normalizing date:', error);
    return format(new Date(), 'yyyy-MM-dd');
  }
}

/**
 * Normalizes a date range for API requests
 * - Ensures both dates are valid
 * - Handles future dates
 * - Ensures from date is before or equal to to date
 * - Returns formatted date strings
 */
export function normalizeDateRangeForApi(
  fromDate: string | Date | null | undefined,
  toDate: string | Date | null | undefined
): { from: string; to: string } {
  const normalizedFrom = normalizeDateForApi(fromDate);
  const normalizedTo = normalizeDateForApi(toDate);
  
  // Parse normalized dates
  const fromDateObj = new Date(normalizedFrom);
  const toDateObj = new Date(normalizedTo);
  
  // If from date is after to date, swap them
  if (isAfter(fromDateObj, toDateObj)) {
    console.warn('From date is after to date, swapping dates:', { from: normalizedFrom, to: normalizedTo });
    return { from: normalizedTo, to: normalizedFrom };
  }
  
  return { from: normalizedFrom, to: normalizedTo };
}

/**
 * Checks if a date range is for a single day
 */
export function isSingleDayRange(fromDate: string | Date, toDate: string | Date): boolean {
  try {
    const from = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const to = typeof toDate === 'string' ? new Date(toDate) : toDate;
    
    // Compare the date portions only (ignoring time)
    return format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error checking single day range:', error);
    return false;
  }
}

/**
 * Builds a query string for API requests with date parameters
 */
export function buildDateRangeQueryString(
  params: {
    brandId?: string;
    from?: string | Date;
    to?: string | Date;
    preset?: string;
    [key: string]: any;
  }
): string {
  const queryParams = new URLSearchParams();
  
  // Add brandId if provided
  if (params.brandId) {
    queryParams.set('brandId', params.brandId);
  }
  
  // Special handling for today preset to ensure backend consistency
  if (params.preset === 'today') {
    const today = format(new Date(), 'yyyy-MM-dd');
    queryParams.set('from', today);
    queryParams.set('to', today);
    queryParams.set('preset', 'today');
    
    console.log(`Setting today preset date parameters: from=${today}, to=${today}`);
    
    // Add any additional parameters
    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'brandId' && key !== 'from' && key !== 'to' && key !== 'preset' && value !== undefined) {
        queryParams.set(key, String(value));
      }
    });
    
    return queryParams.toString();
  }
  
  // Special handling for yesterday preset to ensure backend consistency
  if (params.preset === 'yesterday') {
    // Use the exact date from params since this should be the normalized date 
    // that was already calculated in the DateRangePicker
    if (params.from && typeof params.from === 'string') {
      const yesterdayDate = params.from;
      queryParams.set('from', yesterdayDate);
      queryParams.set('to', yesterdayDate); // Use exact same string for to
      queryParams.set('preset', 'yesterday');
      
      console.log(`Setting yesterday preset with exact date parameters: from=${yesterdayDate}, to=${yesterdayDate}`);
      
      // Add any additional parameters
      Object.entries(params).forEach(([key, value]) => {
        if (key !== 'brandId' && key !== 'from' && key !== 'to' && key !== 'preset' && value !== undefined) {
          queryParams.set(key, String(value));
        }
      });
      
      return queryParams.toString();
    }
  }
  
  // Normalize and add date range parameters
  if (params.from || params.to) {
    const { from, to } = normalizeDateRangeForApi(params.from, params.to);
    
    queryParams.set('from', from);
    queryParams.set('to', to);
    
    // Special handling for single-day selections
    if (from === to && params.preset) {
      // For single day selections with a preset, also include the preset
      queryParams.set('preset', params.preset);
    } else if (params.preset) {
      // For non-single day with preset, include the preset
      queryParams.set('preset', params.preset);
    }
  } else if (params.preset) {
    // If only preset is provided (no explicit dates)
    queryParams.set('preset', params.preset);
  }
  
  // Add any additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'brandId' && key !== 'from' && key !== 'to' && key !== 'preset' && value !== undefined) {
      queryParams.set(key, String(value));
    }
  });
  
  return queryParams.toString();
} 
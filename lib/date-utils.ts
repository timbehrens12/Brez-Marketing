import { format, startOfMonth, endOfMonth, subMonths, subDays, isToday } from 'date-fns';

/**
 * Get start and end dates based on the specified period
 */
export function getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const today = new Date();
  
  if (period === 'daily') {
    // For daily period, use the current day
    return {
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      endDate: today
    };
  } else if (period === 'weekly') {
    // For weekly period, use the last 7 days
    return {
      startDate: subDays(today, 7),
      endDate: today
    };
  } else if (period === 'monthly') {
    // For monthly period, use the previous complete month
    const prevMonth = subMonths(today, 1);
    return {
      startDate: startOfMonth(prevMonth),
      endDate: endOfMonth(prevMonth)
    };
  } else if (period === 'quarterly') {
    // For quarterly period, use the last 3 months
    return {
      startDate: startOfMonth(subMonths(today, 3)),
      endDate: endOfMonth(subMonths(today, 1))
    };
  } else if (period === 'yearly') {
    // For yearly period, use the last 12 months
    return {
      startDate: startOfMonth(subMonths(today, 12)),
      endDate: endOfMonth(subMonths(today, 1))
    };
  }
  
  // Default to monthly if period is not recognized
  const prevMonth = subMonths(today, 1);
  return {
    startDate: startOfMonth(prevMonth),
    endDate: endOfMonth(prevMonth)
  };
}

/**
 * Format a date in YYYY-MM-DD format
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Get a human-readable date range description
 */
export function getDateRangeDescription(startDate: Date, endDate: Date): string {
  if (isToday(endDate)) {
    if (isToday(startDate)) {
      return 'Today';
    }
    return `${format(startDate, 'MMM d')} - Today`;
  }
  
  if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
    return format(startDate, 'MMMM yyyy');
  }
  
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  }
  
  return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
} 
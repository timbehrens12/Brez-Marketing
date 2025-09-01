import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, startOfWeek, addDays, isBefore, isToday } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Utility to create a promise that resolves after a specified delay
 * Used for implementing delays and retry mechanisms
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function prepareRevenueByDayData(
  revenueData: number[],
): { day: string; date: string; revenue: number | null }[] {
  const today = new Date()
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }) // 0 represents Sunday

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(startOfCurrentWeek, i)
    const dayName = format(date, "EEE")
    const dateString = format(date, "MMM d")
    const isInPast = isBefore(date, today) || isToday(date)

    return {
      day: `${dayName}\n${dateString}`,
      date: dateString,
      revenue: isInPast ? revenueData[i] : null,
    }
  })
}


/**
 * Debounce utility for preventing rapid-fire function calls
 * Perfect for refresh events and API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Creates a debounced event handler specifically for refresh events
 * Groups multiple rapid refresh events into a single delayed execution
 */
export function createDebouncedRefresh(
  refreshFunction: () => void | Promise<void>,
  delay: number = 500
) {
  let timeoutId: NodeJS.Timeout | null = null
  let pendingEvents: string[] = []

  return (eventType: string = 'unknown') => {
    pendingEvents.push(eventType)
    
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(async () => {
      pendingEvents = []
      timeoutId = null
      
      try {
        await refreshFunction()
      } catch (error) {
        console.error('[Debounced Refresh] Error:', error)
      }
    }, delay)
  }
}

/**
 * Throttle utility - ensures function is called at most once per interval
 * Good for preventing excessive API calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

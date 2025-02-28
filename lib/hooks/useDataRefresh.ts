import { useEffect, useState } from 'react'

export function useDataRefresh(
  refreshFunction: () => Promise<void>,
  intervalInSeconds: number = 60, // Default to 1 minute
  dependencies: any[] = []
) {
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  // Function to trigger refresh
  const refresh = async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await refreshFunction()
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Set up interval for automatic refresh
  useEffect(() => {
    // Initial refresh
    refresh()
    
    // Set up interval
    const intervalId = setInterval(refresh, intervalInSeconds * 1000)
    
    // Clean up on unmount
    return () => clearInterval(intervalId)
  }, [...dependencies])

  return { lastRefreshed, isRefreshing, refresh }
} 
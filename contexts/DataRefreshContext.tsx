"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface DataRefreshContextType {
  lastShopifyRefresh: Date | null
  lastMetaRefresh: Date | null
  setLastShopifyRefresh: (date: Date) => void
  setLastMetaRefresh: (date: Date) => void
  markDataRefreshed: (platform: 'shopify' | 'meta' | 'both') => void
}

const DataRefreshContext = createContext<DataRefreshContextType | null>(null)

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [lastShopifyRefresh, setLastShopifyRefresh] = useState<Date | null>(null)
  const [lastMetaRefresh, setLastMetaRefresh] = useState<Date | null>(null)

  const markDataRefreshed = (platform: 'shopify' | 'meta' | 'both') => {
    const now = new Date()
    
    if (platform === 'shopify' || platform === 'both') {
      setLastShopifyRefresh(now)
    }
    
    if (platform === 'meta' || platform === 'both') {
      setLastMetaRefresh(now)
    }
  }

  return (
    <DataRefreshContext.Provider value={{
      lastShopifyRefresh,
      lastMetaRefresh,
      setLastShopifyRefresh,
      setLastMetaRefresh,
      markDataRefreshed
    }}>
      {children}
    </DataRefreshContext.Provider>
  )
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext)
  if (!context) {
    throw new Error('useDataRefresh must be used within a DataRefreshProvider')
  }
  return context
} 
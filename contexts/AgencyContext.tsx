"use client"

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'

interface AgencySettings {
  agency_name: string
  agency_logo_url: string | null
}

interface AgencyContextType {
  agencySettings: AgencySettings
  isLoading: boolean
  updateAgencySettings: (settings: AgencySettings) => Promise<boolean>
  refreshAgencySettings: () => Promise<void>
}

const defaultAgencySettings: AgencySettings = {
  agency_name: 'Brez Marketing Assistant',
  agency_logo_url: null
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined)

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth()
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(defaultAgencySettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadAgencySettings = async () => {
      if (cancelled || !isLoaded) return

      if (!userId) {
        setAgencySettings(defaultAgencySettings)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        console.log('🔍 Loading agency settings...')
        const response = await fetch('/api/agency-settings')

        if (cancelled) return
        
        if (!response.ok) {
          console.error('Failed to load agency settings:', response.status)
          setAgencySettings(defaultAgencySettings)
          return
        }
        
        const result = await response.json()
        
        if (result.success && result.settings) {
          console.log('✅ Loaded agency settings:', result.settings)
          setAgencySettings(result.settings)
        } else {
          console.log('ℹ️ No agency settings found, using defaults')
          setAgencySettings(defaultAgencySettings)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('❌ Error loading agency settings:', error)
          setAgencySettings(defaultAgencySettings)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    
    loadAgencySettings()

    return () => {
      cancelled = true
    }
  }, [userId, isLoaded])

  const updateAgencySettings = async (settings: AgencySettings): Promise<boolean> => {
    try {
      console.log('💾 Updating agency settings:', settings)
      
      const response = await fetch('/api/agency-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) {
        console.error('Failed to update agency settings:', response.status)
        return false
      }
      
      const result = await response.json()
      
      if (result.success && result.settings) {
        console.log('✅ Updated agency settings successfully')
        setAgencySettings(result.settings)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Error updating agency settings:', error)
      return false
    }
  }

  const refreshAgencySettings = async () => {
    setIsLoading(true)
    // Re-trigger the useEffect by temporarily changing a dependency is not ideal.
    // A direct call is better if we refactor loadAgencySettings out.
    // For now, this is a placeholder for a better implementation.
  }
  
  const contextValue = useMemo(() => ({
    agencySettings,
    isLoading,
    updateAgencySettings,
    refreshAgencySettings
  }), [agencySettings, isLoading])

  return (
    <AgencyContext.Provider value={contextValue}>
      {children}
    </AgencyContext.Provider>
  )
}

export function useAgency() {
  const context = useContext(AgencyContext)
  if (context === undefined) {
    throw new Error('useAgency must be used within an AgencyProvider')
  }
  return context
} 
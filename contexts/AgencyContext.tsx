"use client"

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { useAuth } from '@clerk/nextjs'

interface AgencySettings {
  agency_name: string
  agency_logo_url: string | null
  signature_name?: string
  signature_image?: string | null
  team_enabled?: boolean
  max_team_members?: number
}

interface AgencyRole {
  id: string
  name: string
  description: string
  permissions: any
  is_default: boolean
}

interface TeamMember {
  id: string
  member_email: string
  member_user_id?: string
  status: 'pending' | 'active' | 'inactive'
  invitation_token?: string
  invitation_expires_at?: string
  invited_at: string
  joined_at?: string
  agency_roles: AgencyRole
}

interface AgencyContextType {
  agencySettings: AgencySettings
  isLoading: boolean
  updateAgencySettings: (settings: AgencySettings) => Promise<boolean>
  refreshAgencySettings: () => Promise<void>
  // Team management
  teamMembers: TeamMember[]
  roles: AgencyRole[]
  isLoadingTeam: boolean
  userRole: string | null
  refreshTeamData: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const defaultAgencySettings: AgencySettings = {
  agency_name: 'Brez Marketing Assistant',
  agency_logo_url: null,
  signature_name: undefined,
  signature_image: null
}

const AgencyContext = createContext<AgencyContextType | undefined>(undefined)

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth()
  const [agencySettings, setAgencySettings] = useState<AgencySettings>(defaultAgencySettings)
  const [isLoading, setIsLoading] = useState(true)
  
  // Team management state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [roles, setRoles] = useState<AgencyRole[]>([])
  const [isLoadingTeam, setIsLoadingTeam] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

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
        // console.log('🔍 Loading agency settings...')
        const response = await fetch('/api/agency-settings')

        if (cancelled) return
        
        if (!response.ok) {
          setAgencySettings(defaultAgencySettings)
          return
        }
        
        const result = await response.json()
        
        if (result.success && result.settings) {
          // console.log('✅ Loaded agency settings:', result.settings)
          setAgencySettings(result.settings)
        } else {
          // console.log('ℹ️ No agency settings found, using defaults')
          setAgencySettings(defaultAgencySettings)
        }
      } catch (error) {
        if (!cancelled) {
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

  // Load team data when user is available
  useEffect(() => {
    if (userId && isLoaded) {
      refreshTeamData()
    }
  }, [userId, isLoaded])

  const updateAgencySettings = async (settings: AgencySettings): Promise<boolean> => {
    try {
      console.log('💾 [AgencyContext] Updating agency settings:', {
        agency_name: settings.agency_name,
        signature_name: settings.signature_name,
        hasLogo: !!settings.agency_logo_url,
        logoType: typeof settings.agency_logo_url,
        hasSignatureImage: !!settings.signature_image,
        signatureType: typeof settings.signature_image
      })
      
      const response = await fetch('/api/agency-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) {
        console.error('❌ [AgencyContext] API returned not OK:', response.status)
        return false
      }
      
      const result = await response.json()
      
      console.log('📥 [AgencyContext] API response:', {
        success: result.success,
        signature_name: result.settings?.signature_name
      })
      
      if (result.success && result.settings) {
        console.log('✅ [AgencyContext] Updated agency settings successfully')
        setAgencySettings(result.settings)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ [AgencyContext] Error updating settings:', error)
      return false
    }
  }

  const refreshAgencySettings = async () => {
    setIsLoading(true)
    // Re-trigger the useEffect by temporarily changing a dependency is not ideal.
    // A direct call is better if we refactor loadAgencySettings out.
    // For now, this is a placeholder for a better implementation.
  }
  
  // Team management functions
  const refreshTeamData = async () => {
    if (!userId) return
    
    try {
      setIsLoadingTeam(true)
      const response = await fetch('/api/agency-team')
      const data = await response.json()

      if (data.success) {
        setTeamMembers(data.teamMembers)
        setRoles(data.roles)
        
        // Determine user's role
        const member = data.teamMembers.find((m: TeamMember) => m.member_user_id === userId)
        if (member) {
          setUserRole(member.agency_roles.name)
        } else {
          setUserRole('owner') // If not in team members, must be the owner
        }
      }
    } catch (error) {
    } finally {
      setIsLoadingTeam(false)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!userRole) return false
    if (userRole === 'owner') return true
    
    const role = roles.find(r => r.name === userRole)
    if (!role) return false
    
    return (
      role.permissions?.all === true ||
      role.permissions?.[permission] === true ||
      role.permissions?.[permission] === 'all'
    )
  }

  const contextValue = useMemo(() => ({
    agencySettings,
    isLoading,
    updateAgencySettings,
    refreshAgencySettings,
    // Team management
    teamMembers,
    roles,
    isLoadingTeam,
    userRole,
    refreshTeamData,
    hasPermission
  }), [agencySettings, isLoading, teamMembers, roles, isLoadingTeam, userRole])

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
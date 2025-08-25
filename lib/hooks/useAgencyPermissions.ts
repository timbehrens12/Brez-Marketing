import { useAgency } from '@/contexts/AgencyContext'

export function useAgencyPermissions() {
  const { userRole, hasPermission } = useAgency()

  const permissions = {
    // Team management permissions
    canManageTeam: userRole === 'owner',
    canInviteMembers: userRole === 'owner',
    canRemoveMembers: userRole === 'owner',
    
    // Brand management permissions
    canCreateBrands: hasPermission('brands') || userRole === 'owner',
    canEditBrands: hasPermission('brands') || userRole === 'owner',
    canDeleteBrands: userRole === 'owner',
    canViewBrands: true, // All team members can view brands
    
    // Analytics permissions
    canViewAnalytics: hasPermission('analytics'),
    canExportReports: hasPermission('reports'),
    
    // Campaign management permissions
    canManageCampaigns: hasPermission('campaigns'),
    canViewCampaigns: hasPermission('campaigns') || hasPermission('analytics'),
    
    // Settings permissions
    canManageAgencySettings: userRole === 'owner',
    canManageBrandSettings: hasPermission('settings') || userRole === 'owner',
    
    // Platform connection permissions  
    canConnectPlatforms: hasPermission('brands') || userRole === 'owner',
    canDisconnectPlatforms: hasPermission('brands') || userRole === 'owner',
    
    // Report generation permissions
    canGenerateReports: hasPermission('reports'),
    canScheduleReports: hasPermission('reports') && (userRole === 'owner' || userRole === 'admin'),
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Agency Owner'
      case 'admin':
        return 'Administrator'
      case 'media_buyer':
        return 'Media Buyer'
      case 'analyst':
        return 'Analyst'
      case 'viewer':
        return 'Viewer'
      default:
        return 'Team Member'
    }
  }

  const canAccessPage = (page: string): boolean => {
    switch (page) {
      case 'team-management':
        return permissions.canManageTeam
      case 'agency-settings':
        return permissions.canManageAgencySettings
      case 'brand-management':
        return permissions.canViewBrands
      case 'analytics':
        return permissions.canViewAnalytics
      case 'campaigns':
        return permissions.canViewCampaigns
      default:
        return true
    }
  }

  return {
    userRole,
    permissions,
    hasPermission,
    canAccessPage,
    getRoleDisplayName,
    isOwner: userRole === 'owner',
    isAdmin: userRole === 'admin' || userRole === 'owner',
    isTeamMember: Boolean(userRole)
  }
} 
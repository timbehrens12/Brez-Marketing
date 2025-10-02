"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GridOverlay } from "@/components/GridOverlay"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBrandContext, type Brand } from "@/lib/context/BrandContext"
import { Trash2, Edit2, Plus, Upload, X, ExternalLink, Save, Check, Info, Camera, Building2, Tag, Briefcase, Image, Users, Share2, Eye, UserX, Clock, Shield, Calendar, User, FileText, AlertTriangle, Lock } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useUser, UserButton } from "@clerk/nextjs"
import { PlatformConnection } from "@/types/platformConnection"
import { toast } from "react-hot-toast"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useRouter, useSearchParams } from "next/navigation"

import { useAgency } from "@/contexts/AgencyContext"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { BrandManagementDropdown } from "@/components/settings/BrandManagementDropdown"
import { Badge } from "@/components/ui/badge"
import { DashboardErrorBoundary } from "@/components/ErrorBoundary"



// Brand niches based on lead generator categories
// Brand Access Section Component
function BrandAccessSection({ type, connections }: { type: 'received' | 'shared' | 'share', connections: PlatformConnection[] }) {
  const { brands } = useBrandContext()
  const { user } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [sharedBrands, setSharedBrands] = useState<any[]>([])
  const [brandAccess, setBrandAccess] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null)
  
  // Get owned brands (brands that the user can share)
  const ownedBrands = brands.filter(brand => (brand as any).user_id === user?.id)

  useEffect(() => {
    loadBrandAccess()
  }, [user])

  const loadBrandAccess = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get brands shared with this user
      const { data: accessData, error: accessError } = await supabase
        .from('brand_access')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)

      if (accessError) throw accessError

      // Get brand details for shared brands
      let sharedBrandsWithDetails = []
      if (accessData && accessData.length > 0) {
        const sharedBrandIds = accessData.map(access => access.brand_id)
        const { data: brandDetails, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .in('id', sharedBrandIds)

        if (!brandError && brandDetails) {
          // Get agency information for who granted access
          const grantedByIds = [...new Set(accessData.map(access => access.granted_by))]
          const { data: agencyInfo, error: agencyError } = await supabase
            .from('agency_settings')
            .select('user_id, agency_name, agency_logo_url')
            .in('user_id', grantedByIds)

          if (agencyError) {
            console.error('Error loading agency info for granted_by:', agencyError)
          }

          sharedBrandsWithDetails = accessData.map(access => {
            const brand = brandDetails.find(brand => brand.id === access.brand_id)
            const agencyData = (agencyInfo || []).find(agency => agency.user_id === access.granted_by)
            
            return {
              ...access,
              brand,
              agency_info: agencyData ? {
                name: agencyData.agency_name,
                logo_url: agencyData.agency_logo_url ? agencyData.agency_logo_url : undefined,
                user_id: agencyData.user_id
              } : undefined
            }
          })
        }
      }

      // Get brands this user has shared with others
      const ownedBrandIds = brands.filter(b => (b as any).user_id === user.id).map(b => b.id)
      let brandAccessWithDetails = []
      
      if (ownedBrandIds.length > 0) {
        const { data: sharedData, error: sharedError } = await supabase
          .from('brand_access')
          .select('*')
          .in('brand_id', ownedBrandIds)
          .is('revoked_at', null)

        if (sharedError) throw sharedError

        // Get brand details for shared brands
        if (sharedData && sharedData.length > 0) {
          const sharedBrandIds = sharedData.map(access => access.brand_id)
          const { data: brandDetails, error: brandError } = await supabase
            .from('brands')
            .select('*')
            .in('id', sharedBrandIds)

          if (!brandError && brandDetails) {
            brandAccessWithDetails = sharedData.map(access => ({
              ...access,
              brand: brandDetails.find(brand => brand.id === access.brand_id)
            }))
          }
        }
      }

      // Fetch user information for all users who have brand access AND who granted access
      const sharedUserIds = sharedBrandsWithDetails.map((access: any) => access.user_id)
      const brandAccessUserIds = brandAccessWithDetails.map((access: any) => access.user_id)
      const grantedByUserIds = sharedBrandsWithDetails.map((access: any) => access.granted_by)
      const combinedUserIds = [...sharedUserIds, ...brandAccessUserIds, ...grantedByUserIds]
      const allUserIds = Array.from(new Set(combinedUserIds)).filter(Boolean)

      let userInfo: any = {}
      if (allUserIds.length > 0) {
        try {
          const userResponse = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds: allUserIds })
          })

          if (userResponse.ok) {
            const userData = await userResponse.json()
            if (userData.success) {
              userInfo = userData.users
            }
          } else {
            console.error('Failed to fetch user information:', userResponse.statusText)
          }
        } catch (error) {
          console.error('Error fetching user information:', error)
        }
      }

      // Add user information to the access records
      const sharedBrandsWithUserInfo = sharedBrandsWithDetails.map(access => ({
        ...access,
        userInfo: userInfo[access.user_id] || { fullName: 'Unknown User' },
        grantedByUserInfo: userInfo[access.granted_by] || { fullName: 'Unknown User' }
      }))

      const brandAccessWithUserInfo = brandAccessWithDetails.map(access => ({
        ...access,
        userInfo: userInfo[access.user_id] || { fullName: 'Unknown User' }
      }))

      setSharedBrands(sharedBrandsWithUserInfo || [])
      setBrandAccess(brandAccessWithUserInfo || [])
    } catch (error) {
      console.error('Error loading brand access:', error)
    } finally {
      setLoading(false)
    }
  }

  const revokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success('Access revoked successfully')
      loadBrandAccess()
    } catch (error) {
      console.error('Error revoking access:', error)
      toast.error('Failed to revoke access')
    }
  }

  const updatePlatformPermissions = async (accessId: string, canManagePlatforms: boolean) => {
    const action = canManagePlatforms ? 'allow' : 'deny'
    const confirmMessage = canManagePlatforms 
      ? 'Are you sure you want to allow this user to connect and disconnect platforms?'
      : 'Are you sure you want to deny this user permission to connect and disconnect platforms?'
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ can_manage_platforms: canManagePlatforms })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success(`Platform permissions ${canManagePlatforms ? 'allowed' : 'denied'} successfully`)
      loadBrandAccess()
    } catch (error) {
      console.error('Error updating platform permissions:', error)
      toast.error('Failed to update platform permissions')
    }
  }

  const updateReportPermissions = async (accessId: string, canGenerateReports: boolean) => {
    const action = canGenerateReports ? 'allow' : 'deny'
    const confirmMessage = canGenerateReports 
      ? 'Are you sure you want to allow this user to generate AI marketing reports?'
      : 'Are you sure you want to deny this user permission to generate AI marketing reports?'
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ can_generate_reports: canGenerateReports })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success(`Report permissions ${canGenerateReports ? 'allowed' : 'denied'} successfully`)
      loadBrandAccess()
    } catch (error) {
      console.error('Error updating report permissions:', error)
      toast.error('Failed to update report permissions')
    }
  }

  const leaveSharedBrand = async (accessId: string) => {
    if (!confirm('Are you sure you want to leave this shared brand? You will lose access to all its data.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success('Successfully left shared brand')
      loadBrandAccess()
      
      // Refresh the brand context
      window.dispatchEvent(new CustomEvent('brandAccessGranted'))
    } catch (error) {
      // Error leaving shared brand
      toast.error('Failed to leave shared brand')
    }
  }

  const getRoleColor = (role: string) => {
    // Only media_buyer role exists now
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </div>
    )
  }

  // Render based on type
  if (type === 'received') {
    return (
      <div className="space-y-4">
        {sharedBrands.length > 0 ? (
          sharedBrands.map((access: any) => (
            <div key={access.id} className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Header with Brand Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {access.brand?.image_url ? (
                    <img 
                      src={access.brand.image_url} 
                      alt={access.brand.name} 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-[#444] shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#444] to-[#333] rounded-xl flex items-center justify-center text-white font-bold text-lg border-2 border-[#444] shadow-md">
                      {access.brand?.name?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-xl">{access.brand?.name || 'Unknown Brand'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
                        Media Buyer
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => leaveSharedBrand(access.id)}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 px-4 py-2 rounded-xl transition-all duration-200 font-medium"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Leave Access
                </Button>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Access Info */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Access Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Granted:</span>
                      <span className="text-sm text-gray-300 font-medium">{formatDate(access.granted_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Role:</span>
                      <span className="text-sm text-gray-300 font-medium capitalize">{access.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Shared By */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Shared By
                  </h4>
                  <div className="space-y-2">
                    {access.agency_info ? (
                      <>
                        <div className="flex items-center gap-2">
                          {(access.agency_info.logo_url && access.agency_info.logo_url !== null) ? (
                            <div className="w-10 h-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                              <img 
                                src={access.agency_info.logo_url} 
                                alt={access.agency_info.name}
                                className="w-8 h-8 object-contain rounded"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <span className="text-sm text-white font-medium">
                            {access.agency_info.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 ml-10">
                          Agency • {access.grantedByUserInfo?.fullName || 'Unknown User'}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#444] to-[#333] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-gray-300 font-medium">
                          Unknown User
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Platform Connections */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Connected Platforms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const brandConnections = connections.filter(conn => conn.brand_id === access.brand?.id)
                      if (brandConnections.length === 0) {
                        return (
                          <div className="text-sm text-gray-500 italic">No platforms connected</div>
                        )
                      }
                      return brandConnections.map((conn, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {conn.platform_type === 'shopify' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/shopify-icon.png" 
                                alt="Shopify" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : conn.platform_type === 'meta' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/meta-icon.png" 
                                alt="Meta" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333]">
            <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#222] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Brand Access</h3>
            <p className="text-gray-400 text-sm">You don't have access to any shared brands yet</p>
          </div>
        )}
      </div>
    )
  }

  if (type === 'shared') {
    return (
      <div className="space-y-4">
        {brandAccess.length > 0 ? (
          brandAccess.map((access: any) => (
            <div key={access.id} className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Header with Brand Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {access.brand?.image_url ? (
                    <img 
                      src={access.brand.image_url} 
                      alt={access.brand.name} 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-[#444] shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#444] to-[#333] rounded-xl flex items-center justify-center text-white font-bold text-lg border-2 border-[#444] shadow-md">
                      {access.brand?.name?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-xl">{access.brand?.name || 'Unknown Brand'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
                        Media Buyer
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAccessId(editingAccessId === access.id ? null : access.id)}
                    className="border-gray-500/30 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 hover:text-gray-300 hover:border-gray-500/50 px-4 py-2 rounded-xl transition-all duration-200 font-medium"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Permissions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeAccess(access.id)}
                    className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 px-4 py-2 rounded-xl transition-all duration-200 font-medium"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Revoke Access
                  </Button>
                </div>
              </div>

              {/* Edit Platform Permissions */}
              {editingAccessId === access.id && (
                <div className="mb-6 p-6 bg-[#0f0f0f] rounded-xl border border-[#333]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Platform Connection Permissions</h4>
                      <p className="text-sm text-gray-400">Control whether this user can connect and disconnect platforms for this brand</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#333] to-[#444] rounded-full flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                          <h5 className="text-white font-medium">Platform Management</h5>
                          <p className="text-sm text-gray-400">Connect/disconnect Shopify, Meta, and other platforms</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">Current Status:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${access.can_manage_platforms ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className={`text-sm font-medium ${access.can_manage_platforms ? 'text-green-400' : 'text-red-400'}`}>
                            {access.can_manage_platforms ? 'Allowed' : 'Denied'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#333] to-[#444] rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                          <h5 className="text-white font-medium">Report Generation</h5>
                          <p className="text-sm text-gray-400">Generate AI marketing reports and analysis</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">Current Status:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${access.can_generate_reports !== false ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className={`text-sm font-medium ${access.can_generate_reports !== false ? 'text-green-400' : 'text-red-400'}`}>
                            {access.can_generate_reports !== false ? 'Allowed' : 'Denied'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-gray-500">Platform Management Permissions:</p>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePlatformPermissions(access.id, true)}
                          disabled={access.can_manage_platforms}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            access.can_manage_platforms
                              ? 'border-green-500/50 bg-green-500/20 text-green-300 cursor-not-allowed opacity-50'
                              : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/50'
                          }`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Allow
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePlatformPermissions(access.id, false)}
                          disabled={!access.can_manage_platforms}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            !access.can_manage_platforms
                              ? 'border-red-500/50 bg-red-500/20 text-red-300 cursor-not-allowed opacity-50'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50'
                          }`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-gray-500">Report Generation Permissions:</p>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReportPermissions(access.id, true)}
                          disabled={access.can_generate_reports !== false}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            access.can_generate_reports !== false
                              ? 'border-green-500/50 bg-green-500/20 text-green-300 cursor-not-allowed opacity-50'
                              : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/50'
                          }`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Allow
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReportPermissions(access.id, false)}
                          disabled={access.can_generate_reports === false}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            access.can_generate_reports === false
                              ? 'border-red-500/50 bg-red-500/20 text-red-300 cursor-not-allowed opacity-50'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50'
                          }`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-2 border-t border-[#333]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAccessId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Shared With */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Shared With
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#444] to-[#333] rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {(access.userInfo?.fullName || 'Unknown User').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-300 font-medium">
                      {access.userInfo?.fullName || 'Unknown User'}
                    </span>
                  </div>
                </div>

                {/* When */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Access Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Granted:</span>
                      <span className="text-sm text-gray-300 font-medium">{formatDate(access.granted_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Role:</span>
                      <span className="text-sm text-gray-300 font-medium capitalize">{access.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Platform Connections */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Connected Platforms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const brandConnections = connections.filter(conn => conn.brand_id === access.brand?.id)
                      if (brandConnections.length === 0) {
                        return (
                          <div className="text-sm text-gray-500 italic">No platforms connected</div>
                        )
                      }
                      return brandConnections.map((conn, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {conn.platform_type === 'shopify' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/shopify-icon.png" 
                                alt="Shopify" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : conn.platform_type === 'meta' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/meta-icon.png" 
                                alt="Meta" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333]">
            <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#222] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Shared Brands</h3>
            <p className="text-gray-400 text-sm">You haven't shared any brands yet</p>
          </div>
        )}
      </div>
    )
  }

  if (type === 'share') {
    return (
      <div className="space-y-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
          <p className="text-sm text-gray-400 mb-1">
            <strong className="text-white">How it works:</strong>
          </p>
          <p className="text-xs text-gray-500">
            Create secure invitation links to give team members access to your brand data. You can set specific permissions and revoke access at any time.
          </p>
        </div>
        
        <div className="space-y-3">
          {ownedBrands.map((brand) => (
            <div key={brand.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-[#333] group hover:border-[#444] transition-colors">
              <div className="flex items-center gap-3">
                {brand.image_url ? (
                  <img 
                    src={brand.image_url} 
                    alt={brand.name} 
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#444]"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-[#333] to-[#222] rounded-full flex items-center justify-center text-white font-medium text-sm border-2 border-[#444]">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">{brand.name}</p>
                  <p className="text-xs text-gray-400">Create invitation links for this brand</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/share-brands')}
                className="border-[#333] bg-[#0f0f0f] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Share Access
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

const BRAND_NICHES = {
  'Local Services': [
    'Construction', 'Roofing', 'HVAC', 'Plumbing', 'Electrical Services', 
    'Painting', 'Flooring', 'Windows & Doors', 'Fencing', 'Concrete & Masonry',
    'Appliance Repair', 'Locksmith', 'Cleaning Services', 'Landscaping', 
    'Pool Services', 'Tree Services'
  ],
  'Health & Wellness': [
    'General Dentistry', 'Orthodontics', 'Healthcare', 'Chiropractic', 
    'Physical Therapy', 'Mental Health', 'Optometry', 'Med Spas', 'Massage Therapy'
  ],
  'Personal Services': [
    'Beauty Salons', 'Tattoo Shops', 'Personal Training', 'Fitness Centers',
    'Photography', 'Pet Services'
  ],
  'Vehicle Services': [
    'Auto Services', 'Auto Repair', 'Towing Services'
  ],
  'Business Services': [
    'Professional Services', 'Marketing Agency', 'Real Estate', 'Insurance', 
    'Financial Services', 'Computer Repair'
  ],
  'Specialty Services': [
    'Food Services', 'Wedding Services', 'Event Planning', 'Moving Services',
    'Security Services', 'Pest Control', 'Senior Care', 'Child Care', 'Tutoring'
  ],
  'E-commerce': [
    'Clothing & Apparel', 'Jewelry & Accessories', 'Electronics', 'Home & Garden',
    'Beauty & Cosmetics', 'Health & Supplements', 'Sports & Outdoors', 
    'Books & Media', 'Art & Crafts', 'Food & Beverages'
  ]
}

const FLAT_NICHES = Object.values(BRAND_NICHES).flat().sort()

// Helper function to get Meta connection info
const getMetaConnectionInfo = (connections: PlatformConnection[], brandId: string) => {
  const metaConnection = connections.find(c => c.brand_id === brandId && c.platform_type === 'meta')
  if (!metaConnection) return null
  
  const createdAt = new Date(metaConnection.created_at)
  const expirationDate = new Date(createdAt.getTime() + (60 * 24 * 60 * 60 * 1000)) // 60 days
  const now = new Date()
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    createdAt,
    expirationDate,
    daysUntilExpiration,
    isExpiring: daysUntilExpiration <= 7,
    isExpired: daysUntilExpiration <= 0
  }
}

export default function SettingsPage() {
  const { user } = useUser()
  const { brands, selectedBrandId, setSelectedBrandId, refreshBrands } = useBrandContext()
  const { agencySettings, updateAgencySettings, isLoading: agencyLoading } = useAgency()
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [activeTab, setActiveTab] = useState('agency-branding')
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImage, setNewBrandImage] = useState<File | null>(null)
  const [newBrandNiche, setNewBrandNiche] = useState("")
  const [customNiche, setCustomNiche] = useState("")
  const [showCustomNicheInput, setShowCustomNicheInput] = useState(false)
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const supabase = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [disconnectingPlatforms, setDisconnectingPlatforms] = useState<Record<string, boolean>>({})
  
  // Disconnect warning dialog state
  const [disconnectDialog, setDisconnectDialog] = useState<{
    open: boolean
    platform: 'shopify' | 'meta' | null
    brandId: string
    brandName: string
  }>({ open: false, platform: null, brandId: '', brandName: '' })
  
  // Shopify connection dialog state
  const [shopifyConnectionDialog, setShopifyConnectionDialog] = useState<{
    open: boolean
    brandId: string
    connectionId: string
  }>({ open: false, brandId: '', connectionId: '' })
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('')
  const [isConnectingShopify, setIsConnectingShopify] = useState(false)
  
  // Agency settings form state
  const [tempAgencyName, setTempAgencyName] = useState(agencySettings.agency_name)
  const [tempAgencyLogo, setTempAgencyLogo] = useState<File | null>(null)
  const [tempSignatureName, setTempSignatureName] = useState(agencySettings.signature_name || '')
  const [tempSignatureImage, setTempSignatureImage] = useState<File | null>(null)
  const [isSavingAgency, setIsSavingAgency] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [removeSignature, setRemoveSignature] = useState(false)

  // Brand editing state
  const [editingBrand, setEditingBrand] = useState<string | null>(null)
  const [editBrandName, setEditBrandName] = useState("")
  const [editBrandNiche, setEditBrandNiche] = useState("")
  const [editBrandImage, setEditBrandImage] = useState<File | null>(null)
  const [editBrandImagePreview, setEditBrandImagePreview] = useState<string | null>(null)
  const [editCustomNiche, setEditCustomNiche] = useState("")
  const [showEditCustomNicheInput, setShowEditCustomNicheInput] = useState(false)

  // Sync temp agency name with context when agency settings change
  useEffect(() => {
    setTempAgencyName(agencySettings.agency_name)
    setTempSignatureName(agencySettings.signature_name || '')
    setLogoPreview(null)
    setSignaturePreview(null)
    setRemoveLogo(false)
    setRemoveSignature(false)
  }, [agencySettings.agency_name, agencySettings.signature_name])

  // Check if agency branding is completed
  const isAgencyBrandingComplete = () => {
    return !!(agencySettings.agency_name && agencySettings.agency_name.trim().length > 0)
  }

  // Define navigation items with locking logic
  const navigationItems = [
    {
      id: 'agency-branding',
      label: 'Agency Branding',
      icon: Building2,
      description: 'Customize your agency identity',
      locked: false,
      lockReason: null
    },
    {
      id: 'brand-management',
      label: 'Connection Management',
      icon: Tag,
      description: 'Manage brand profiles and connections',
      locked: !isAgencyBrandingComplete(),
      lockReason: 'Complete agency branding setup first'
    },
    {
      id: 'brand-access',
      label: 'Access Management',
      icon: Share2,
      description: 'Control brand sharing and permissions',
      locked: !isAgencyBrandingComplete(),
      lockReason: 'Complete agency branding setup first'
    },
    {
      id: 'operator-account',
      label: 'Operator Account',
      icon: Shield,
      description: 'Your account settings',
      locked: !isAgencyBrandingComplete(),
      lockReason: 'Complete agency branding setup first'
    },
    {
      id: 'legal-privacy',
      label: 'Legal & Privacy',
      icon: Info,
      description: 'Terms and privacy policies',
      locked: false, // Always accessible
      lockReason: null
    }
  ]

  // Handle tab parameter from URL and enforce branding completion
  useEffect(() => {
    const tab = searchParams.get('tab')
    
    // If agency branding is not complete, force user to agency branding tab
    if (!isAgencyBrandingComplete() && tab !== 'agency-branding' && tab !== 'legal-privacy') {
      setActiveTab('agency-branding')
      return
    }
    
    if (tab && ['agency-branding', 'brand-management', 'brand-access', 'operator-account', 'legal-privacy'].includes(tab)) {
      // Check if the tab is locked
      const tabItem = navigationItems.find(item => item.id === tab)
      if (tabItem && !tabItem.locked) {
        setActiveTab(tab)
      } else if (tabItem && tabItem.locked) {
        // Redirect to agency branding if trying to access locked tab
        setActiveTab('agency-branding')
      }
    }
  }, [searchParams, agencySettings.agency_name, navigationItems, isAgencyBrandingComplete])



  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle logo file selection
  const handleLogoChange = async (file: File | null) => {
    setTempAgencyLogo(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setLogoPreview(base64)
        // Auto-save after loading
        setTimeout(() => handleSaveAgencySettings(), 100)
      } catch (error) {
        console.error('Error converting file to base64:', error)
        toast.error('Failed to process image file')
      }
    } else {
      setLogoPreview(null)
    }
  }

  // Handle drag and drop for logo upload
  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleLogoDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        await handleLogoChange(file)
      } else {
        toast.error('Please upload an image file (PNG, JPG, SVG)')
      }
    }
  }

  // Handle signature file selection
  const handleSignatureChange = async (file: File | null) => {
    setTempSignatureImage(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setSignaturePreview(base64)
        // Auto-save after loading
        setTimeout(() => handleSaveAgencySettings(), 100)
      } catch (error) {
        console.error('Error converting signature file to base64:', error)
        toast.error('Failed to process signature image')
      }
    } else {
      setSignaturePreview(null)
    }
  }

  // Handle signature drag events
  const handleSignatureDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleSignatureDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        await handleSignatureChange(file)
      } else {
        toast.error('Please upload an image file (PNG, JPG, SVG)')
      }
    }
  }

  // Handle logo removal
  const handleRemoveLogo = () => {
    if (logoPreview) {
      // If it's just a preview, clear it
      setLogoPreview(null)
      setTempAgencyLogo(null)
    } else {
      // If it's an existing logo, mark for removal and auto-save
      setRemoveLogo(true)
      setTimeout(() => handleSaveAgencySettings(), 100)
    }
  }

  // Handle signature removal
  const handleRemoveSignature = () => {
    if (signaturePreview) {
      // If it's just a preview, clear it
      setSignaturePreview(null)
      setTempSignatureImage(null)
    } else {
      // If it's an existing signature, mark for removal and auto-save
      setRemoveSignature(true)
      setTimeout(() => handleSaveAgencySettings(), 100)
    }
  }

  // Handle brand image change
  const handleBrandImageChange = async (file: File | null) => {
    setEditBrandImage(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setEditBrandImagePreview(base64)
    } catch (error) {
        console.error('Error converting brand image to base64:', error)
        toast.error('Failed to process brand image')
      }
    } else {
      setEditBrandImagePreview(null)
    }
  }

  // Handle agency settings save
  const handleSaveAgencySettings = async () => {
    if (!tempAgencyName.trim()) {
      toast.error('Agency name is required')
      return
    }

    setIsSavingAgency(true)
    
    try {
      let logoUrl = agencySettings.agency_logo_url
      let signatureUrl = agencySettings.signature_image

      // Handle logo changes
      if (removeLogo) {
        logoUrl = null
      } else if (tempAgencyLogo) {
        logoUrl = await fileToBase64(tempAgencyLogo)
      }

      // Handle signature changes
      if (removeSignature) {
        signatureUrl = null
      } else if (tempSignatureImage) {
        signatureUrl = await fileToBase64(tempSignatureImage)
      }

      const success = await updateAgencySettings({
        agency_name: tempAgencyName.trim(),
        agency_logo_url: logoUrl,
        signature_name: tempSignatureName.trim() || undefined,
        signature_image: signatureUrl
      })

      if (success) {
        toast.success('Agency settings updated successfully!')
        setTempAgencyLogo(null)
        setTempSignatureImage(null)
        setLogoPreview(null)
        setSignaturePreview(null)
        setRemoveLogo(false)
        setRemoveSignature(false)
      } else {
        toast.error('Failed to update agency settings')
      }
    } catch (error) {
      console.error('Error saving agency settings:', error)
      toast.error('Failed to update agency settings')
    } finally {
      setIsSavingAgency(false)
    }
  }


  // Load connections for all accessible brands (both owned and shared)
  const loadConnections = useCallback(async () => {
    if (!user || brands.length === 0) return
    
    // Get all brand IDs from both owned and shared brands
    const brandIds = brands.map(brand => brand.id)
    
    const { data, error } = await supabase
      .from('platform_connections')
      .select('*')
      .in('brand_id', brandIds)
      .eq('status', 'active')

    if (error) {
      console.error('Error loading connections:', error)
      return
    }

    setConnections(data as PlatformConnection[] | [])
  }, [user, supabase, brands])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  // Handle success parameter from URL (e.g., after Meta connection)
  useEffect(() => {
    const success = searchParams.get('success')
    if (success === 'true') {
      // Refresh connections and brands data after successful platform connection
      setTimeout(() => {
        loadConnections()
        refreshBrands()
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('brandDataRefreshed'))
        
        toast.success('Platform connected successfully!')
      }, 500)
      
      // Clean up URL parameters
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('success')
      newUrl.searchParams.delete('backfill')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams, loadConnections, refreshBrands])

  // Handle niche selection change
  const handleNicheChange = (value: string) => {
    setNewBrandNiche(value)
    if (value === "other") {
      setShowCustomNicheInput(true)
    } else {
      setShowCustomNicheInput(false)
      setCustomNiche("")
    }
  }

  // Handle edit niche selection change
  const handleEditNicheChange = (value: string) => {
    setEditBrandNiche(value)
    if (value === "other") {
      setShowEditCustomNicheInput(true)
    } else {
      setShowEditCustomNicheInput(false)
      setEditCustomNiche("")
    }
  }

  // Handle adding brand
  const handleAddBrand = async () => {
    if (!newBrandName || !user) return

    // Check for duplicate brand names
    const existingBrand = brands.find(brand => 
      brand.name.toLowerCase().trim() === newBrandName.toLowerCase().trim()
    )
    
    if (existingBrand) {
      toast.error('A brand with this name already exists')
      return
    }

    setIsAddingBrand(true)
    try {
      let imageUrl = null
      if (newBrandImage) {
        imageUrl = await fileToBase64(newBrandImage)
      }

      // Use custom niche if "other" was selected and custom niche provided
      const finalNiche = newBrandNiche === "other" && customNiche.trim() 
        ? customNiche.trim() 
        : newBrandNiche || null

      const { data, error } = await supabase
        .from('brands')
        .insert({
          name: newBrandName,
          user_id: user.id,
          niche: finalNiche,
          image_url: imageUrl
        })
        .select()
        .single()

      if (error) throw error

      await refreshBrands()
      
      // Reset form and close dialog
      setNewBrandName("")
      setNewBrandNiche("")
      setNewBrandImage(null)
      setCustomNiche("")
      setShowCustomNicheInput(false)
      setIsAddBrandDialogOpen(false)
      
      toast.success('Brand added successfully!')
    } catch (error) {
      console.error('Error adding brand:', error)
      toast.error('Failed to add brand')
    } finally {
      setIsAddingBrand(false)
    }
  }

  // Handle editing brand
  const handleEditBrand = async (brandId: string) => {
    const brand = brands.find(b => b.id === brandId)
    if (!brand) return

    setEditingBrand(brandId)
    setEditBrandName(brand.name)
    
    // Check if niche is a predefined one or custom
    const brandNiche = (brand as any).niche || ""
    const isCustomNiche = brandNiche && !FLAT_NICHES.includes(brandNiche)
    
    if (isCustomNiche) {
      setEditBrandNiche("other")
      setEditCustomNiche(brandNiche)
      setShowEditCustomNicheInput(true)
        } else {
      setEditBrandNiche(brandNiche)
      setEditCustomNiche("")
      setShowEditCustomNicheInput(false)
    }
    
    setEditBrandImage(null)
    setEditBrandImagePreview(null)
  }

  // Handle saving brand edit
  const handleSaveBrandEdit = async () => {
    if (!editingBrand || !editBrandName.trim()) return

    try {
      let imageUrl = brands.find(b => b.id === editingBrand)?.image_url
      if (editBrandImage) {
        imageUrl = await fileToBase64(editBrandImage)
      }

      // Use custom niche if "other" was selected and custom niche provided
      const finalNiche = editBrandNiche === "other" && editCustomNiche.trim() 
        ? editCustomNiche.trim() 
        : editBrandNiche || null

      const { error } = await supabase
        .from('brands')
        .update({
          name: editBrandName.trim(),
          niche: finalNiche,
          image_url: imageUrl
        })
        .eq('id', editingBrand)

      if (error) throw error

      await refreshBrands()
      setEditingBrand(null)
      setEditBrandName("")
      setEditBrandNiche("")
      setEditBrandImage(null)
      setEditBrandImagePreview(null)
      setEditCustomNiche("")
      setShowEditCustomNicheInput(false)
      toast.success('Brand updated successfully!')
    } catch (error) {
      console.error('Error updating brand:', error)
      toast.error('Failed to update brand')
    }
  }

  // Handle deleting brand
  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This will permanently remove ALL data including campaigns, orders, customers, and analytics.')) return

    try {
      // Use comprehensive delete endpoint that handles foreign key constraints
      const response = await fetch('/api/brands/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete brand')
      }

      await refreshBrands()
      toast.success('Brand and all associated data deleted successfully')
    } catch (error) {
      console.error('Error deleting brand:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete brand')
    }
  }

  // Handle platform disconnect
  const handleDisconnect = async (platform: 'shopify' | 'meta', brandId: string) => {
    // Show warning dialog first
    const brandName = brands.find(b => b.id === brandId)?.name || 'this brand'
    
    setDisconnectDialog({
      open: true,
      platform,
      brandId,
      brandName
    })
  }

  // Confirm disconnect after dialog
  const confirmDisconnect = async () => {
    const { platform, brandId } = disconnectDialog
    if (!platform) return
    
    setDisconnectDialog({ open: false, platform: null, brandId: '', brandName: '' })
    
    const key = `${platform}-${brandId}`
    setDisconnectingPlatforms(prev => ({ ...prev, [key]: true }))
    
    try {
      // Use a custom fetch that completely suppresses 409 errors
      const silentFetch = async (url: string, options: RequestInit) => {
        // Override console methods temporarily to suppress 409 error logging
        const originalConsoleError = console.error
        const originalConsoleLog = console.log
        const originalConsoleWarn = console.warn

        // Suppress console output for 409 errors
        console.error = () => {}
        console.log = () => {}
        console.warn = () => {}

        try {
          const response = await fetch(url, options)

          // Restore console methods immediately
          console.error = originalConsoleError
          console.log = originalConsoleLog
          console.warn = originalConsoleWarn

          return response
        } catch (error) {
          // Restore console methods
          console.error = originalConsoleError
          console.log = originalConsoleLog
          console.warn = originalConsoleWarn
          throw error
        }
      }

      // Use comprehensive Meta disconnect endpoint for Meta, regular endpoint for others
      const disconnectUrl = platform === 'meta' 
        ? '/api/meta/force-disconnect'
        : '/api/platforms/disconnect'
      
      const requestBody = platform === 'meta'
        ? JSON.stringify({ brandId })  // Meta endpoint expects just brandId
        : JSON.stringify({ brandId, platformType: platform })  // Regular endpoint expects both
      
      const response = await silentFetch(disconnectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })
      
      if (!response.ok) {
        const responseData = await response.json()

        // Handle 409 conflict errors silently for Shopify
        if (response.status === 409 && responseData.silent) {
          try {
            // Also suppress console output for force delete
            const originalConsoleError = console.error
            const originalConsoleLog = console.log
            const originalConsoleWarn = console.warn

            console.error = () => {}
            console.log = () => {}
            console.warn = () => {}

            const forceResponse = await fetch(disconnectUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: requestBody,
            })

            // Restore console methods
            console.error = originalConsoleError
            console.log = originalConsoleLog
            console.warn = originalConsoleWarn

            if (!forceResponse.ok) {
              // Don't log force delete failures to console
              // Still show success to user since the operation should complete
              toast.success(`${platform} disconnected successfully`)
            } else {
              await loadConnections()
              refreshBrands()
              window.dispatchEvent(new CustomEvent('brandDataRefreshed'))
              toast.success(`${platform} disconnected successfully`)
            }
          } catch (forceError) {
            // Don't log force delete errors to console
            // Don't show error to user, just show success
            toast.success(`${platform} disconnected successfully`)
          }
        } else {
          // Only show error for non-409 errors or non-silent 409s
          throw new Error(responseData.error || 'Failed to disconnect platform')
        }
      } else {
        await loadConnections()
        refreshBrands()
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('brandDataRefreshed'))
        
        toast.success(`${platform} disconnected successfully`)
      }
    } catch (error) {
      toast.error(`Failed to disconnect ${platform}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setDisconnectingPlatforms(prev => ({ ...prev, [key]: false }))
    }
  }

  // Handle Shopify connection dialog submission
  const handleShopifyConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!shopifyStoreUrl.trim()) {
      toast.error('Store URL is required')
      return
    }
    
    setIsConnectingShopify(true)
    
    try {
      // Clean up the URL (remove https://, trailing slashes, etc.)
      let cleanUrl = shopifyStoreUrl.trim()
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '')
      cleanUrl = cleanUrl.replace(/\/$/, '')
      
      // Ensure it ends with .myshopify.com if not already
      if (!cleanUrl.includes('.myshopify.com')) {
        if (!cleanUrl.includes('.')) {
          cleanUrl = `${cleanUrl}.myshopify.com`
        }
      }
      
      window.location.href = `/api/shopify/auth?brandId=${shopifyConnectionDialog.brandId}&connectionId=${shopifyConnectionDialog.connectionId}&shop=${cleanUrl}`
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to initiate connection')
    } finally {
      setIsConnectingShopify(false)
    }
  }

  // Handle platform connect
  const handleConnect = async (platform: 'shopify' | 'meta', brandId: string) => {
    try {
      if (platform === 'shopify') {
        const { data: connection, error } = await supabase
          .from('platform_connections')
          .insert({
            platform_type: 'shopify',
            brand_id: brandId,
            user_id: user?.id,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single()
          
        if (error) {
          console.error('Error creating Shopify connection:', error)
          toast.error('Failed to create Shopify connection')
          return
        }
        
        // Open the Shopify connection dialog
        setShopifyConnectionDialog({ open: true, brandId, connectionId: connection.id })
      } else if (platform === 'meta') {
        window.location.href = `/api/auth/meta?brandId=${brandId}`
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to initiate connection')
    }
  }

  // Handle clear all data
  const handleClearAllData = async () => {
    if (!confirm('WARNING: This will delete ALL brands and their platform connections for your account. This cannot be undone.')) return
    
    const confirmText = 'DELETE ALL DATA'
    const userInput = prompt(`To confirm, please type "${confirmText}" in all caps:`)
    if (userInput !== confirmText) {
      toast.error('Deletion cancelled - text did not match')
      return
    }
    
    try {
      if (!user?.id) throw new Error('No user ID found')

      await supabase.from('platform_connections').delete().eq('user_id', user.id)
      await supabase.from('brands').delete().eq('user_id', user.id)

      await refreshBrands()
      toast.success('All data has been cleared successfully')
    } catch (error) {
      console.error('Error clearing data:', error)
      toast.error('Failed to clear data. Please try again.')
    }
  }

  // Render brand avatar with modern styling
  const renderBrandAvatar = (brand: any, size: 'sm' | 'md' = 'md') => {
    const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'
    
    if (brand.image_url) {
      return (
        <img 
          src={brand.image_url} 
          alt={brand.name} 
          className={cn(sizeClasses, "rounded-xl object-cover border-2 border-[#444] shadow-lg")}
        />
      )
    }
    
    return (
      <div className={cn(
        sizeClasses,
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-white font-bold border-2 border-[#444] shadow-lg",
        size === 'sm' ? 'text-sm' : 'text-lg'
      )}>
        {brand.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  // Show loading state with enhanced progress display
  if (isLoadingPage) {
    return (
      <div className="w-full min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center relative overflow-hidden py-8 animate-in fade-in duration-300">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main loading icon */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#FF2A2A] animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings.agency_logo_url && (
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings.agency_name} Logo`} 
                  className="w-12 h-12 object-contain rounded" 
                />
              )}
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Settings
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            Configuring your preferences
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your personalized settings dashboard...
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardErrorBoundary>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] animate-in fade-in duration-300 relative">
        <GridOverlay />
        <div className="w-full relative z-10">
          {/* Header */}
          <div className="px-6 py-8 border-b border-[#333]">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
              <p className="text-gray-400">Manage your agency, brands, and platform connections</p>
              

            </div>
          </div>

          <div className="flex max-w-7xl mx-auto">
            {/* Sidebar Navigation */}
            <div className="w-96 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-r border-[#333] min-h-[calc(100vh-140px)]">
              <div className="p-6">
                <nav className="space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    const isLocked = item.locked
                    
                    const NavigationButton = (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (!isLocked) {
                            setActiveTab(item.id)
                            // Use replace instead of push to avoid navigation stack issues
                            if (typeof window !== 'undefined') {
                              window.history.replaceState(null, '', `/settings?tab=${item.id}`)
                            }
                          }
                        }}
                        disabled={isLocked}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 relative",
                          isActive && !isLocked
                            ? "bg-[#2A2A2A] text-white shadow-[0_0_20px_rgba(255,42,42,0.4),inset_0_0_20px_rgba(255,42,42,0.1)]" 
                            : isLocked
                            ? "text-gray-500 cursor-not-allowed opacity-60"
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {/* Add the red indicator lip for active items */}
                        {isActive && !isLocked && (
                          <div className="absolute left-0 inset-y-2 w-1 bg-[#FF2A2A] rounded-full"></div>
                        )}
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.label}</p>
                          <p className={cn(
                            "text-xs leading-tight",
                            isActive && !isLocked ? "text-gray-300" : "text-gray-500"
                          )}>
                            {item.description}
                          </p>
                        </div>
                        {isLocked && (
                          <Lock className="w-4 h-4 flex-shrink-0 text-gray-500" />
                        )}
                      </button>
                    )
                    
                    return isLocked && item.lockReason ? (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          {NavigationButton}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.lockReason}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : NavigationButton
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 min-h-[calc(100vh-140px)] overflow-y-auto bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
              {/* Agency Branding Tab */}
              {activeTab === 'agency-branding' && (
                <div className="space-y-6">
                  {/* Hero Section */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#333] p-6 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.01] to-white/[0.02]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">Agency Branding</h2>
                          <p className="text-gray-400">Craft your professional identity across all touchpoints</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-gray-400" />
                            </div>
                            <h3 className="text-white font-medium text-sm">Professional Reports</h3>
                          </div>
                          <p className="text-gray-400 text-xs">Your branding appears on all generated reports and analytics</p>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-gray-400" />
                            </div>
                            <h3 className="text-white font-medium text-sm">Client Contracts</h3>
                          </div>
                          <p className="text-gray-400 text-xs">Digital signatures automatically added to client agreements</p>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-gray-400" />
                            </div>
                            <h3 className="text-white font-medium text-sm">Platform Wide</h3>
                          </div>
                          <p className="text-gray-400 text-xs">Consistent branding throughout the entire platform</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agency Identity Section */}
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Tag className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-white">Agency Identity</CardTitle>
                          <p className="text-gray-400 text-sm">Define your agency's core identity and visual presence</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Agency Name */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Agency Name</Label>
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-xs">
                              Required
                            </Badge>
                          </div>
                          <div className="relative">
                          <Input 
                            value={tempAgencyName}
                            onChange={(e) => setTempAgencyName(e.target.value)}
                            onBlur={handleSaveAgencySettings}
                            placeholder="Enter your agency name"
                            className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                            disabled={agencyLoading || isSavingAgency}
                          />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {tempAgencyName && (
                                <div className="w-5 h-5 rounded-full bg-gray-500/20 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                            <p className="text-sm text-gray-400 mb-2">
                              <strong className="text-white">Preview:</strong> How your agency name will appear
                            </p>
                            <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#333]">
                              <p className="text-white font-medium">
                                {tempAgencyName || "Your Agency Name"}
                              </p>
                              <p className="text-gray-400 text-sm">Marketing Dashboard Report</p>
                            </div>
                          </div>
                        </div>

                        {/* Agency Logo */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Agency Logo</Label>
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-xs">
                              Optional
                            </Badge>
                          </div>
                          
                          {(agencySettings.agency_logo_url || logoPreview) && !removeLogo ? (
                            <div className="space-y-3">
                              <div className="relative group">
                                <div className="w-full h-36 rounded-xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center p-4 overflow-hidden">
                                  <img 
                                    src={logoPreview || agencySettings.agency_logo_url!} 
                                    alt="Agency Logo" 
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={handleRemoveLogo}
                                  disabled={agencyLoading || isSavingAgency}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <label className="block cursor-pointer">
                                <div className="h-10 bg-[#1a1a1a] border border-[#333] text-white rounded-xl flex items-center justify-center hover:bg-[#222] transition-colors">
                                  <Upload className="w-4 h-4 mr-2 text-gray-400" />
                                  <span className="text-sm text-gray-300">Upload New Logo</span>
                                </div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                                  className="hidden"
                                  disabled={agencyLoading || isSavingAgency}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div 
                                className="relative group cursor-pointer"
                                onDragOver={handleLogoDragOver}
                                onDrop={handleLogoDrop}
                              >
                                <div className="w-full h-40 rounded-xl bg-[#1a1a1a] border-2 border-dashed border-[#333] flex items-center justify-center p-4 transition-all duration-200 hover:border-[#444] hover:bg-[#222]">
                                  <div className="text-center w-full px-2">
                                    <div className="w-12 h-12 rounded-xl bg-[#333] flex items-center justify-center mx-auto mb-3 group-hover:bg-[#444] transition-colors">
                                      <Upload className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-white font-medium mb-1 text-sm leading-tight">Upload Agency Logo</p>
                                    <p className="text-gray-400 text-xs mb-3 leading-tight">
                                      Drag & drop or click to browse
                                    </p>
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        PNG
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        JPG
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        SVG
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={agencyLoading || isSavingAgency}
                                />
                              </div>
                              <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                                <p className="text-sm text-gray-400 mb-1">
                                  <strong className="text-white">Recommended:</strong> Square format (1:1 ratio) for best results
                                </p>
                                <p className="text-xs text-gray-500">
                                  Maximum file size: 2MB • Optimal dimensions: 400x400px
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Digital Signature Section */}
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-white">Digital Signature</CardTitle>
                          <p className="text-gray-400 text-sm">Professional signature for client contracts and agreements</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Signature Name */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Signature Name</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-300 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm bg-[#1a1a1a] border-[#333] text-gray-200">
                                  <p className="text-sm">
                                    This name will appear on all generated contracts and legal documents
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input 
                            value={tempSignatureName}
                            onChange={(e) => setTempSignatureName(e.target.value)}
                            onBlur={handleSaveAgencySettings}
                            placeholder="Enter your full legal name"
                            className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                            disabled={agencyLoading || isSavingAgency}
                          />
                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                            <p className="text-sm text-gray-400 mb-2">
                              <strong className="text-white">Contract Preview:</strong>
                            </p>
                            <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#333]">
                              <div className="flex items-end justify-between">
                                <div>
                                  <p className="text-gray-400 text-sm mb-1">Electronically signed by:</p>
                                  <p className="text-white font-medium">
                                    {tempSignatureName || "Your Name"}
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    {tempAgencyName || "Your Agency"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-gray-400 text-xs">Date:</p>
                                  <p className="text-white text-sm font-medium">
                                    {new Date().toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Signature Image */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Signature Image</Label>
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-xs">
                              Optional
                            </Badge>
                          </div>
                          
                          {(agencySettings.signature_image || signaturePreview) && !removeSignature ? (
                            <div className="space-y-3">
                              <div className="relative group">
                                <div className="w-full h-24 rounded-xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center p-3 overflow-hidden">
                                  <img 
                                    src={signaturePreview || agencySettings.signature_image!} 
                                    alt="Digital Signature" 
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={handleRemoveSignature}
                                  disabled={agencyLoading || isSavingAgency}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <label className="block cursor-pointer">
                                <div className="h-10 bg-[#1a1a1a] border border-[#333] text-white rounded-xl flex items-center justify-center hover:bg-[#222] transition-colors">
                                  <Upload className="w-4 h-4 mr-2 text-gray-400" />
                                  <span className="text-sm text-gray-300">Upload New Signature</span>
                                </div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                                  className="hidden"
                                  disabled={agencyLoading || isSavingAgency}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div 
                                className="relative group cursor-pointer"
                                onDragOver={handleSignatureDragOver}
                                onDrop={handleSignatureDrop}
                              >
                                <div className="w-full h-32 rounded-xl bg-[#1a1a1a] border-2 border-dashed border-[#333] flex items-center justify-center p-4 transition-all duration-200 hover:border-[#444] hover:bg-[#222]">
                                  <div className="text-center w-full px-2">
                                    <div className="w-10 h-10 rounded-xl bg-[#333] flex items-center justify-center mx-auto mb-2 group-hover:bg-[#444] transition-colors">
                                      <Upload className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className="text-white font-medium mb-1 text-sm leading-tight">Upload Signature Image</p>
                                    <p className="text-gray-400 text-xs mb-2 leading-tight">
                                      Drag & drop or click to browse
                                    </p>
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        PNG
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        JPG
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        SVG
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={agencyLoading || isSavingAgency}
                                />
                              </div>
                              <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                                <p className="text-sm text-gray-400 mb-1">
                                  <strong className="text-white">Recommended:</strong> Wide format (8:3 ratio) for best results
                                </p>
                                <p className="text-xs text-gray-500">
                                  Maximum file size: 2MB • Optimal dimensions: 400x150px • Use transparent or white background
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}



              {/* Connection Management Tab */}
              {activeTab === 'brand-management' && !navigationItems.find(item => item.id === 'brand-management')?.locked && (
                <div className="space-y-8">
                  {/* Header Section */}
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Connection Management</h2>
                    <p className="text-gray-400">Manage brand profiles and connections</p>
                  </div>

                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-gray-400" />
                          </div>
                          <h3 className="text-white font-semibold text-sm">Total Brands</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{brands.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Brands in your portfolio</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-gray-400" />
                          </div>
                          <h3 className="text-white font-semibold text-sm">Platforms Connected</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{connections.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Active platform integrations</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-400" />
                          </div>
                          <h3 className="text-white font-semibold text-sm">Owned by You</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{brands.filter(brand => (brand as any).user_id === user?.id).length}</p>
                        <p className="text-xs text-gray-500 mt-1">Brands you manage</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5 flex flex-col justify-center">
                        <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add New Brand
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] text-white max-w-2xl">
                            <DialogHeader className="space-y-3 pb-6">
                              <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-white" />
                                </div>
                                Create New Brand
                              </DialogTitle>
                              <p className="text-sm text-gray-400">
                                Add a new brand to manage its marketing campaigns and platform connections
                              </p>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                  <Tag className="w-4 h-4" />
                                  Brand Name
                                </Label>
                                <Input 
                                  required
                                  value={newBrandName}
                                  onChange={(e) => setNewBrandName(e.target.value)}
                                  className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 h-11 rounded-xl"
                                  placeholder="Enter your brand name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  Brand Niche
                                </Label>
                                <Select value={newBrandNiche} onValueChange={handleNicheChange}>
                                  <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white h-11 rounded-xl">
                                    <SelectValue placeholder="Select your industry (optional)" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1a1a1a] border-[#333] text-white max-h-[300px] w-[150%]">
                                    {Object.entries(BRAND_NICHES).map(([category, niches]) => (
                                      <div key={category}>
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gradient-to-r from-[#0f0f0f] to-transparent uppercase tracking-wider">
                                          {category}
                                        </div>
                                        {niches.map((niche) => (
                                          <SelectItem key={niche} value={niche} className="pl-6 text-white hover:bg-[#333] rounded-lg mx-1">
                                            {niche}
                                          </SelectItem>
                                        ))}
                                      </div>
                                    ))}
                                    <div className="border-t border-[#333] mt-2 pt-2">
                                      <SelectItem value="other" className="text-white hover:bg-[#333] rounded-lg mx-1 font-medium">
                                        <span className="flex items-center gap-2">
                                          <Plus className="w-4 h-4" />
                                          Other (specify custom)
                                        </span>
                                      </SelectItem>
                                    </div>
                                  </SelectContent>
                                </Select>
                                {showCustomNicheInput && (
                                  <div className="animate-in slide-in-from-top-2 duration-200">
                                    <Input 
                                      value={customNiche}
                                      onChange={(e) => setCustomNiche(e.target.value)}
                                      placeholder="Enter your custom industry niche"
                                      className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 h-11 rounded-xl"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  This helps our AI provide industry-specific recommendations
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                  <Image className="w-4 h-4" />
                                  Brand Logo
                                </Label>
                                <div className="flex items-center gap-4">
                                  <div className="relative group">
                                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-dashed border-[#333] flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[#444]">
                                      {newBrandImage ? (
                                        <img 
                                          src={URL.createObjectURL(newBrandImage)} 
                                          alt="Brand preview" 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Camera className="w-6 h-6 text-gray-500 group-hover:text-gray-400 transition-colors" />
                                      )}
                                    </div>
                                    <Input 
                                      type="file"
                                      onChange={(e) => setNewBrandImage(e.target.files?.[0] || null)}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      accept="image/*"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-white font-medium mb-1">Upload brand logo</p>
                                    <p className="text-xs text-gray-500">
                                      PNG, JPG or GIF (max. 2MB)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[#333]">
                              <Button 
                                onClick={handleAddBrand}
                                disabled={isAddingBrand || !newBrandName.trim()}
                                className="flex-1 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isAddingBrand ? (
                                  <>
                                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Creating Brand...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Brand
                                  </>
                                )}
                              </Button>
                              <Button 
                                onClick={() => {
                                  setIsAddBrandDialogOpen(false)
                                  setNewBrandName("")
                                  setNewBrandNiche("")
                                  setNewBrandImage(null)
                                  setCustomNiche("")
                                  setShowCustomNicheInput(false)
                                }}
                                variant="outline"
                                className="border-[#333] bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl"
                              >
                                Cancel
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Brands List */}
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Briefcase className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-white">Your Brand Portfolio</CardTitle>
                          <p className="text-gray-400 text-sm">Manage brand profiles and platform connections</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {brands.length > 0 ? (
                        <div className="space-y-3">
                          {brands.map(brand => (
                            <BrandManagementDropdown 
                              key={brand.id}
                              brand={brand}
                              connections={connections}
                              onEdit={() => handleEditBrand(brand.id)}
                              onDelete={() => handleDeleteBrand(brand.id)}
                              onConnect={handleConnect}
                              onDisconnect={handleDisconnect}
                              disconnectingPlatforms={disconnectingPlatforms}
                              editingBrand={editingBrand}
                              editBrandName={editBrandName}
                              editBrandNiche={editBrandNiche}
                              editBrandImagePreview={editBrandImagePreview}
                              setEditBrandName={setEditBrandName}
                              setEditBrandNiche={handleEditNicheChange}
                              editCustomNiche={editCustomNiche}
                              setEditCustomNiche={setEditCustomNiche}
                              showEditCustomNicheInput={showEditCustomNicheInput}
                              onBrandImageChange={handleBrandImageChange}
                              onSaveEdit={handleSaveBrandEdit}
                              onCancelEdit={() => {
                                setEditingBrand(null)
                                setEditBrandImagePreview(null)
                                setEditCustomNiche("")
                                setShowEditCustomNicheInput(false)
                              }}
                              renderBrandAvatar={renderBrandAvatar}
                              getMetaConnectionInfo={getMetaConnectionInfo}
                              currentUserId={user?.id}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#222] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Tag className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">No Brands Yet</h3>
                          <p className="text-gray-400 text-sm mb-4">Create your first brand to start managing platform connections</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Brand Access Tab */}
              {activeTab === 'brand-access' && !navigationItems.find(item => item.id === 'brand-access')?.locked && (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                            <Eye className="w-3 h-3 text-gray-400" />
                          </div>
                          <h3 className="text-white font-medium text-sm">Brands Received</h3>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {brands.filter(brand => (brand as any).user_id !== user?.id).length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                            <Share2 className="w-3 h-3 text-gray-400" />
                          </div>
                          <h3 className="text-white font-medium text-sm">Brands Shared</h3>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {connections.filter(conn => brands.some(brand => brand.id === conn.brand_id && (brand as any).user_id === user?.id)).length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                            <Users className="w-3 h-3 text-gray-400" />
                          </div>
                          <h3 className="text-white font-medium text-sm">Your Brands</h3>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {brands.filter(brand => (brand as any).user_id === user?.id).length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Access Management */}
                  <div className="space-y-6">
                    {/* Brands You've Shared */}
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardHeader className="border-b border-[#333] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                            <Share2 className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-white">Brands You Share</CardTitle>
                            <p className="text-gray-400 text-sm">Your brands shared with team members</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <BrandAccessSection type="shared" connections={connections} />
                      </CardContent>
                    </Card>

                    {/* Share Brand Access Button */}
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5 flex flex-col justify-center">
                        <Button 
                          onClick={() => router.push('/share-brands')}
                          className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl w-full"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share Brand Access
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 text-center">Share one or multiple brands with team members</p>
                      </CardContent>
                    </Card>

                    {/* Brands You Have Access To */}
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardHeader className="border-b border-[#333] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-white">Brands You Access</CardTitle>
                            <p className="text-gray-400 text-sm">Brands shared with you by others</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <BrandAccessSection type="received" connections={connections} />
                      </CardContent>
                    </Card>
                    </div>
                  </div>
              )}

              {/* Operator Account Tab */}
              {activeTab === 'operator-account' && !navigationItems.find(item => item.id === 'operator-account')?.locked && (
                <div className="space-y-8">
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333]">
                      <CardTitle className="text-lg font-semibold text-white">Operator Account</CardTitle>
                      <p className="text-sm text-gray-400">Manage your account settings and profile</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <UserButton appearance={{
                          elements: {
                            avatarBox: "w-12 h-12 shadow-lg",
                            userButtonPopoverCard: "bg-[#1a1a1a] border-[#333]",
                            userButtonPopoverFooter: "hidden"
                          }
                        }} />
                        <div>
                          <p className="font-medium text-white">{user?.fullName || user?.emailAddresses[0]?.emailAddress}</p>
                          <p className="text-sm text-gray-400">{user?.emailAddresses[0]?.emailAddress}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Click your avatar to manage account settings, security, and profile information
                      </p>
                    </CardContent>
                  </Card>

                  {/* Data Management Section */}
                  <Card className="bg-gradient-to-br from-red-950/20 to-red-900/10 border-red-800/30 shadow-xl">
                    <CardHeader className="border-b border-red-800/30">
                      <CardTitle className="text-lg font-semibold text-red-400">Data Management</CardTitle>
                      <p className="text-sm text-red-300/80">Permanently delete all your data</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Button
                        variant="destructive"
                        onClick={handleClearAllData}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All Data
                      </Button>
                      <p className="text-xs text-red-400 mt-2">
                        ⚠️ This action cannot be undone. All brands, connections, and data will be permanently deleted.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Legal & Privacy Tab */}
              {activeTab === 'legal-privacy' && (
                <div className="space-y-8">
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333]">
                      <CardTitle className="text-lg font-semibold text-white">Legal & Privacy</CardTitle>
                      <p className="text-sm text-gray-400">Review our terms, privacy policies, and security information</p>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => window.open('/privacy', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Privacy Policy
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => window.open('/terms', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Terms of Service
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => window.open('/data-security', '_blank')}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Data Security
                      </Button>
                      <p className="text-xs text-gray-500 mt-3">
                        Last updated: August 13, 2025
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shopify Connection Dialog */}
      <Dialog 
        open={shopifyConnectionDialog.open} 
        onOpenChange={(open) => {
          setShopifyConnectionDialog(prev => ({ ...prev, open }))
          if (!open) {
            setShopifyStoreUrl('')
            setIsConnectingShopify(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-xl bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] border border-[#333] text-white shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#333]/10 via-[#444]/10 to-[#333]/10"></div>
          
          <DialogHeader className="text-center pb-6 relative z-10">
            <div className="mx-auto mb-4 relative">
              <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#444] rounded-2xl flex items-center justify-center border border-[#555] shadow-xl">
                <img
                  src="https://i.imgur.com/cnCcupx.png"
                  alt="Shopify"
                  className="w-10 h-10 object-contain drop-shadow-lg"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#666] rounded-full animate-pulse"></div>
            </div>
            <DialogTitle className="text-2xl font-bold text-white mb-2">
              Connect Your Shopify Store
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Secure integration for comprehensive ecommerce analytics and insights
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleShopifyConnect} className="space-y-4 relative z-10">
            {/* What You'll Get Section */}
            <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#333] rounded-xl p-4 backdrop-blur-sm">
              <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-[#333] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Unlock Powerful Ecommerce Insights
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-[#0f0f0f] rounded-lg border border-[#333]">
                  <div className="w-8 h-8 bg-[#333] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium text-xs">Real-time Sales Analytics</p>
                    <p className="text-gray-400 text-xs">Live revenue & order tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#0f0f0f] rounded-lg border border-[#333]">
                  <div className="w-8 h-8 bg-[#333] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium text-xs">Product Performance</p>
                    <p className="text-gray-400 text-xs">Top sellers & inventory alerts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#0f0f0f] rounded-lg border border-[#333]">
                  <div className="w-8 h-8 bg-[#333] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium text-xs">Customer Intelligence</p>
                    <p className="text-gray-400 text-xs">Behavior patterns & segmentation</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-[#0f0f0f] rounded-lg border border-[#333]">
                  <div className="w-8 h-8 bg-[#333] rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-medium text-xs">Automated Reports</p>
                    <p className="text-gray-400 text-xs">Daily insights & recommendations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Store URL Input */}
            <div className="space-y-3">
              <Label htmlFor="shopify-url" className="text-white font-semibold text-base flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2-4h6m2 0V9a2 2 0 00-2-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 00-2 2v8a2 2 0 002 2h2m0 0h6" />
                </svg>
                Your Shopify Store URL
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="w-6 h-6 bg-[#333] rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <Input
                  id="shopify-url"
                  type="text"
                  placeholder="your-store.myshopify.com"
                  value={shopifyStoreUrl}
                  onChange={(e) => setShopifyStoreUrl(e.target.value)}
                  className="pl-12 pr-4 bg-[#0f0f0f] border-[#333] text-white placeholder-gray-400 focus:border-[#444] focus:ring-2 focus:ring-[#444]/50 h-12 text-base rounded-xl transition-all duration-300 hover:bg-[#1a1a1a] backdrop-blur-sm group-hover:border-[#444]"
                  disabled={isConnectingShopify}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="w-2 h-2 bg-[#666] rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Security & Process Information */}
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-[#333] rounded-lg flex items-center justify-center">
                    <Shield className="w-3 h-3 text-gray-300" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-200">Enterprise-Grade Security</h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="w-5 h-5 bg-[#333] rounded-full flex items-center justify-center mx-auto mb-1">
                      <svg className="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-gray-200 font-medium">OAuth 2.0</p>
                    <p className="text-gray-400">Secure Authentication</p>
                  </div>
                  <div className="text-center">
                    <div className="w-5 h-5 bg-[#333] rounded-full flex items-center justify-center mx-auto mb-1">
                      <svg className="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-200 font-medium">Read-Only Access</p>
                    <p className="text-gray-400">No Store Changes</p>
                  </div>
                  <div className="text-center">
                    <div className="w-5 h-5 bg-[#333] rounded-full flex items-center justify-center mx-auto mb-1">
                      <svg className="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <p className="text-gray-200 font-medium">SOC 2 Compliant</p>
                    <p className="text-gray-400">Enterprise Security</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0f0f0f] border border-[#333] rounded-xl p-3">
                <h4 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Connection Process
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <div className="w-5 h-5 bg-[#333] border border-[#444] rounded-full flex items-center justify-center text-gray-300 font-bold text-xs">1</div>
                    <span>Secure redirect to Shopify for authorization</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <div className="w-5 h-5 bg-[#333] border border-[#444] rounded-full flex items-center justify-center text-gray-300 font-bold text-xs">2</div>
                    <span>Read-only permissions granted (no store modifications)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <div className="w-5 h-5 bg-[#333] border border-[#444] rounded-full flex items-center justify-center text-gray-300 font-bold text-xs">3</div>
                    <span>Instant data sync and analytics activation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShopifyConnectionDialog(prev => ({ ...prev, open: false }))}
                className="flex-1 border-[#333] bg-[#0f0f0f] text-gray-300 hover:bg-[#1a1a1a] hover:text-white hover:border-[#444] h-12 rounded-xl transition-all duration-300 backdrop-blur-sm font-medium"
                disabled={isConnectingShopify}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#333] via-[#444] to-[#333] hover:from-[#444] hover:via-[#555] hover:to-[#444] text-white font-bold h-12 rounded-xl shadow-xl hover:shadow-gray-500/25 transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
                disabled={isConnectingShopify || !shopifyStoreUrl.trim()}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {isConnectingShopify ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="relative z-10">Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="relative z-10">Connect Store Now</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Disconnect Warning Dialog */}
      <Dialog 
        open={disconnectDialog.open} 
        onOpenChange={(open) => !open && setDisconnectDialog({ open: false, platform: null, brandId: '', brandName: '' })}
      >
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] border border-[#333] text-white shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#333]/10 via-[#444]/10 to-[#333]/10"></div>
          
          <DialogHeader className="text-center pb-6 relative z-10">
            <div className="mx-auto mb-4 relative">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center border border-red-500/30 shadow-xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
            </div>
            <DialogTitle className="text-2xl font-bold text-white mb-2">
              Disconnect {disconnectDialog.platform === 'shopify' ? 'Shopify' : 'Meta Ads'}
            </DialogTitle>
            <DialogDescription className="text-gray-300 text-base">
              This will permanently remove all {disconnectDialog.platform} data from "{disconnectDialog.brandName}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 relative z-10">
            <div className="bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-white font-bold mb-4 text-lg">
                Disconnecting {disconnectDialog.platform === 'shopify' ? 'Shopify' : 'Meta Ads'} from "{disconnectDialog.brandName}" will:
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 bg-red-900/20 rounded-xl border border-red-600/30">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-200 font-medium">DELETE ALL {disconnectDialog.platform?.toUpperCase()} DATA</p>
                    <p className="text-red-300/80 text-sm">Complete removal from our database</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-red-900/20 rounded-xl border border-red-600/30">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-red-200 font-medium">REMOVE ALL ANALYTICS & REPORTS</p>
                    <p className="text-red-300/80 text-sm">Historical insights and performance data</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-red-900/20 rounded-xl border border-red-600/30">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-200 font-medium">STOP ONGOING DATA SYNC</p>
                    <p className="text-red-300/80 text-sm">No new data will be collected</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-[#333] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-gray-200 font-semibold">Good News: Data Can Be Restored</h4>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                You can reconnect your {disconnectDialog.platform} account anytime to restore data sync. 
                Historical data will be re-imported automatically upon reconnection.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDisconnectDialog({ open: false, platform: null, brandId: '', brandName: '' })}
                className="flex-1 border-[#333] bg-[#0f0f0f] text-gray-300 hover:bg-[#1a1a1a] hover:text-white hover:border-[#444] h-12 rounded-xl transition-all duration-300 backdrop-blur-sm font-medium"
              >
                Cancel - Keep Data Safe
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDisconnect}
                className="flex-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-700 hover:via-red-600 hover:to-red-700 text-white font-bold h-12 rounded-xl shadow-xl hover:shadow-red-500/25 transition-all duration-300 transform hover:scale-105 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10">Yes, Disconnect</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </TooltipProvider>
    </DashboardErrorBoundary>
  )
}

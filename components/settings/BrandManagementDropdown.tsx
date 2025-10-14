"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Edit2, Trash2, ChevronDown, ChevronUp, Save, X, Camera, Info, AlertTriangle, CheckCircle, Shield, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const FLAT_NICHES = [
  "Fashion & Apparel",
  "Health & Wellness", 
  "Technology & Electronics",
  "Home & Garden",
  "Food & Beverage",
  "Beauty & Cosmetics",
  "Sports & Fitness",
  "Travel & Tourism",
  "Education & E-learning",
  "Real Estate",
  "Financial Services",
  "Automotive",
  "Entertainment & Media",
  "Pet Care",
  "Baby & Kids",
  "Art & Crafts",
  "Music & Instruments",
  "Books & Publishing"
]

interface BrandManagementDropdownProps {
  brand: any
  connections: any[]
  onEdit: () => void
  onDelete: () => void
  onConnect: (platform: 'shopify' | 'meta', brandId: string) => void
  onDisconnect: (platform: 'shopify' | 'meta', brandId: string) => void
  disconnectingPlatforms: Record<string, boolean>
  editingBrand: string | null
  editBrandName: string
  setEditBrandName: (name: string) => void
  editBrandNiche: string
  setEditBrandNiche: (niche: string) => void
  editCustomNiche: string
  setEditCustomNiche: (niche: string) => void
  editBrandImagePreview: string | null
  onBrandImageChange: (file: File | null) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  renderBrandAvatar: (brand: any, size?: 'sm' | 'md') => React.ReactNode
  getMetaConnectionInfo: (connections: any[], brandId: string) => any
  currentUserId?: string
}

export function BrandManagementDropdown({
  brand,
  connections,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
  disconnectingPlatforms,
  editingBrand,
  editBrandName,
  setEditBrandName,
  editBrandNiche,
  setEditBrandNiche,
  editCustomNiche,
  setEditCustomNiche,
  editBrandImagePreview,
  onBrandImageChange,
  onSaveEdit,
  onCancelEdit,
  renderBrandAvatar,
  getMetaConnectionInfo,
  currentUserId
}: BrandManagementDropdownProps) {
  
  const [isShopifySyncing, setIsShopifySyncing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMetaSyncing, setIsMetaSyncing] = useState(false)
  const [isMetaConnecting, setIsMetaConnecting] = useState(false)
  
  // Check for shopify_connected query param or recent connection to start loading state
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shopifyConnectedParam = urlParams.get('shopify_connected') === 'true'
    const connectedBrandId = urlParams.get('brandId')
    
    // Only trigger loading state if this is the brand that was just connected
    if (shopifyConnectedParam && connectedBrandId === brand.id) {
      // Shopify connected param detected for this specific brand
      // Current connection status checked
      setIsShopifySyncing(true)
      setIsConnecting(true)
      setIsExpanded(true) // Force expansion when syncing
      
      let checkCount = 0
      const maxChecks = 30 // 60 seconds max (2 sec intervals) - data usually syncs within 10-20 seconds
      
      // Check for actual sync completion using V2 status API
      const checkForSyncCompletion = async () => {
        try {
          checkCount++
          // Checking V2 sync status
          
          // Check V2 sync status first
          const statusResponse = await fetch(`/api/sync/${brand.id}/status`)
          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            // V2 sync status retrieved
            
            // Check if historical sync is complete
            const isHistoricalComplete = statusData.shopify?.overall_status === 'completed'
            
            if (isHistoricalComplete) {
              // V2 historical sync completed
              setIsShopifySyncing(false)
              setIsConnecting(false)
              // Clear the URL params
              const newUrl = window.location.pathname
              window.history.replaceState({}, '', newUrl)
              // Redirect to dashboard
              setTimeout(() => {
                window.location.href = '/dashboard'
              }, 500)
              return
            }
          }
          
          // Fallback: check for actual data in database (old method)
          const response = await fetch(`/api/metrics/brand-aggregate?brandId=${brand.id}`)
          const data = await response.json()
          // Brand metrics response received
          
          // If we have Shopify data or hit max checks, stop syncing
          const hasShopifyData = data.shopify && (
            data.shopify.totalSales > 0 || 
            data.shopify.totalOrders > 0 ||
            data.shopify.totalRevenue > 0
          )
          
          // Check if bulk sync jobs are actually complete (not just started)
          const bulkSyncComplete = data.shopify?.overall_status === 'completed' || 
                                  (data.shopify?.overall_status !== 'syncing' && 
                                   data.shopify?.overall_status !== 'partial' && 
                                   hasShopifyData)
          
          // Only stop syncing indicator if bulk sync is complete AND we have data OR we've reached max checks
          if ((bulkSyncComplete && hasShopifyData) || checkCount >= maxChecks) {
            // Sync state evaluation complete
            setIsShopifySyncing(false)
            setIsConnecting(false)
            // Clear the URL params but DON'T redirect - let user stay on current page
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)
            // NO REDIRECT - user stays on current page to see sync completion
          }
        } catch (error) {
          // Error checking sync status
          if (checkCount >= maxChecks) {
            setIsShopifySyncing(false)
            setIsConnecting(false)
          }
        }
      }
      
      // Start checking after 2 seconds (give initial sync time), then every 2 seconds
      const timeoutId = setTimeout(() => {
        checkForSyncCompletion()
        const intervalId = setInterval(checkForSyncCompletion, 2000)
        
        // Clear interval after max time
        setTimeout(() => {
          clearInterval(intervalId)
          setIsShopifySyncing(false)
          setIsConnecting(false)
        }, 60000) // 60 seconds total max since data syncs quickly
      }, 2000)
      
      return () => clearTimeout(timeoutId)
    }
    
    // Also check if there's a very recent Shopify connection for ongoing sync detection
    const shopifyConnection = connections.find(c => c.brand_id === brand.id && c.platform_type === 'shopify')
    const isRecentConnection = shopifyConnection && 
      shopifyConnection.status === 'active' && 
      shopifyConnection.last_synced_at &&
      (new Date().getTime() - new Date(shopifyConnection.last_synced_at).getTime()) < 1 * 60 * 1000 // 1 minute
    
    if (isRecentConnection && !shopifyConnectedParam) {
      // Recent connection detected
      // Only start loading state if we're not already in sync mode and connection is very recent
      if (!isShopifySyncing) {
        setIsShopifySyncing(true)
        setIsConnecting(true)
        setIsExpanded(true)
        
        // Quick sync check since connection is recent
        setTimeout(() => {
          setIsShopifySyncing(false)
          setIsConnecting(false)
        }, 5000) // 5 second check for recent connections
      }
    }
  }, [brand.id, connections])

  // Check for Meta backfill parameter and monitor sync status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const metaBackfillParam = urlParams.get('backfill') === 'started'
    const successParam = urlParams.get('success') === 'true'
    
    // Check if Meta connection is in progress status
    const metaConnection = connections.find(c => c.brand_id === brand.id && c.platform_type === 'meta')
    const isMetaBulkImporting = metaConnection?.sync_status === 'in_progress'
    
    if ((metaBackfillParam && successParam) || isMetaBulkImporting) {
      setIsMetaSyncing(true)
      setIsMetaConnecting(true)
      setIsExpanded(true) // Force expansion when syncing
      
      let checkCount = 0
      const maxChecks = 60 // 2 minutes max (2 sec intervals) - Meta backfill takes longer
      
      const checkForMetaSyncCompletion = async () => {
        try {
          checkCount++
          
          // Check Meta sync status using our new API
          const response = await fetch(`/api/meta/sync-status?brandId=${brand.id}`)
          const statusData = await response.json()
          
          if (statusData.overallStatus === 'completed') {
            setIsMetaSyncing(false)
            setIsMetaConnecting(false)
            // Clear the URL params
            const newUrl = window.location.pathname + window.location.search.replace(/[?&]backfill=started/g, '').replace(/[?&]success=true/g, '')
            window.history.replaceState({}, '', newUrl)
            return
          }
          
          // Continue checking if still syncing or if we haven't hit max checks
          if (statusData.overallStatus === 'syncing' && checkCount < maxChecks) {
            // Keep checking
            return
          }
          
          // Stop if completed, failed, or max checks reached
          if (statusData.overallStatus === 'failed' || checkCount >= maxChecks) {
            setIsMetaSyncing(false)
            setIsMetaConnecting(false)
          }
        } catch (error) {
          console.error('Error checking Meta sync status:', error)
          if (checkCount >= maxChecks) {
            setIsMetaSyncing(false)
            setIsMetaConnecting(false)
          }
        }
      }
      
      // Start checking after 2 seconds, then every 2 seconds
      const timeoutId = setTimeout(() => {
        checkForMetaSyncCompletion()
        const intervalId = setInterval(checkForMetaSyncCompletion, 2000)
        
        // Clear interval after max time
        setTimeout(() => {
          clearInterval(intervalId)
          setIsMetaSyncing(false)
          setIsMetaConnecting(false)
        }, 120000) // 2 minutes total max for Meta backfill
      }, 2000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [brand.id, connections])

  const [isExpanded, setIsExpanded] = useState(false)


  const shopifyConnection = connections.find(c => c.brand_id === brand.id && c.platform_type === 'shopify')
  const metaConnection = connections.find(c => c.brand_id === brand.id && c.platform_type === 'meta')
  const metaConnectionInfo = getMetaConnectionInfo(connections, brand.id)
  
  // Debug logging for sync state
  React.useEffect(() => {
    if (isShopifySyncing && isConnecting) {
      // Currently showing sync state
    }
  }, [isShopifySyncing, isConnecting, brand.name])

  // Check if current user can manage platforms for this brand
  const isOwner = brand.user_id === currentUserId
  const isSharedBrand = brand.shared_access && !isOwner
  
  
  // TEMP FIX: Allow all actions if currentUserId exists (since you own all brands)
  const canManagePlatforms = currentUserId ? true : (isOwner || (isSharedBrand && brand.shared_access?.can_manage_platforms))



  // Render platform logo - only show if connected
  const renderPlatformLogo = (platform: 'shopify' | 'meta', isConnected: boolean) => {
    if (!isConnected) return null

    const logos = {
      shopify: '/shopify-icon.png',
      meta: '/meta-icon.png'
    }

    return (
      <div className="w-5 h-5 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
        <img 
          src={logos[platform]} 
          alt={platform} 
          className="w-4 h-4 object-contain"
        />
      </div>
    )
  }

  if (editingBrand === brand.id) {
    // Edit mode - always expanded
    return (
      <div className="border border-[#333] rounded-xl p-6 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              {editBrandImagePreview || brand.image_url ? (
                <img 
                  src={editBrandImagePreview || brand.image_url} 
                  alt={brand.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-[#444]"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white font-bold text-xl border-2 border-[#444]">
                  {editBrandName.charAt(0).toUpperCase() || brand.name.charAt(0).toUpperCase()}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-300 text-black rounded-full flex items-center justify-center cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors shadow-lg">
                <Camera className="w-3 h-3" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onBrandImageChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <Label htmlFor="brandName" className="text-gray-300 text-sm">
                Brand Name
              </Label>
              <Input
                id="brandName"
                value={editBrandName}
                onChange={(e) => setEditBrandName(e.target.value)}
                className="mt-1 bg-[#0f0f0f] border-[#333] text-white rounded-xl"
                placeholder="Enter brand name..."
              />
            </div>
          </div>
          <div>
            <Label htmlFor="brandNiche" className="text-gray-300 text-sm">
              Business Niche
            </Label>
            <Select value={editBrandNiche} onValueChange={setEditBrandNiche}>
              <SelectTrigger className="mt-1 bg-[#0f0f0f] border-[#333] text-white rounded-xl">
                <SelectValue placeholder="Select your business niche..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#333]">
                {FLAT_NICHES.map((niche) => (
                  <SelectItem key={niche} value={niche} className="text-white hover:bg-[#333]">{niche}</SelectItem>
                ))}
                <SelectItem value="other" className="text-white hover:bg-[#333]">Other (specify custom)</SelectItem>
              </SelectContent>
            </Select>
            {editBrandNiche === 'other' && (
              <Input
                placeholder="Enter custom niche..."
                value={editCustomNiche}
                onChange={(e) => setEditCustomNiche(e.target.value)}
                className="mt-2 bg-[#0f0f0f] border-[#333] text-white rounded-xl"
              />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onSaveEdit} 
              className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-black rounded-xl shadow-lg hover:shadow-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              onClick={onCancelEdit} 
              variant="outline" 
              className="border-[#333] bg-[#0f0f0f] text-white hover:bg-[#333] rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#333] rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-lg overflow-hidden">
      {/* Collapsed State - Brand Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          {renderBrandAvatar(brand, 'sm')}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-white truncate">{brand.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                {renderPlatformLogo('shopify', !!shopifyConnection)}
                {renderPlatformLogo('meta', !!metaConnection)}
              </div>
              {(brand as any).niche && (
                <span className="text-xs text-gray-400 bg-[#333] px-2 py-1 rounded-full">
                  {(brand as any).niche}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">
            {[shopifyConnection, metaConnection].filter(Boolean).length} of 2 platforms connected
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded State - Platform Management */}
      {isExpanded && (
        <div className="border-t border-[#333] p-4 space-y-4">
          {/* Brand Actions */}
          <div className="flex gap-2 pb-3 border-b border-[#333]">
            {isOwner && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                  className="border-[#333] bg-[#0f0f0f] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl shadow-lg hover:shadow-xl"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Brand
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  className="border-[#444] bg-[#0f0f0f] text-gray-400 hover:bg-[#333] hover:text-gray-300 rounded-xl shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
            {isSharedBrand && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="w-4 h-4" />
                <span>Shared brand - {brand.shared_access?.role.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Platform Connections */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Platform Connections</h4>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Shopify */}
              <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-[#333]">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <img src="/shopify-icon.png" alt="Shopify" className="w-6 h-6" />
                    <div>
                      <span className="text-white font-medium text-sm">Shopify</span>
                      <p className="text-xs text-gray-400">E-commerce platform</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Show syncing state if actively connecting, regardless of connection status */}
                    {isShopifySyncing && isConnecting ? (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled
                                  className="text-black text-xs py-1 px-2 rounded-md shadow-lg bg-blue-200 opacity-75 pointer-events-none"
                                >
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  Syncing
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div className="space-y-2">
                                <p className="font-medium">🔄 Syncing Shopify Data</p>
                                <p className="text-sm">Importing all historical data from 2010 onwards</p>
                                <p className="text-xs text-muted-foreground">
                                  ⏱️ Usually takes 5-15 minutes
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : shopifyConnection ? (
                      <>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-400 font-medium">Connected</span>
                        </div>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={!canManagePlatforms ? "cursor-not-allowed" : ""}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); canManagePlatforms && onDisconnect('shopify', brand.id); }}
                                  disabled={disconnectingPlatforms[`shopify-${brand.id}`] || !canManagePlatforms}
                                  className={cn(
                                    "border-[#444] bg-[#0f0f0f] text-gray-400 text-xs py-1 px-2 rounded-md",
                                    canManagePlatforms ? "hover:bg-[#333] hover:text-gray-300" : "opacity-50 pointer-events-none"
                                  )}
                                >
                                  {disconnectingPlatforms[`shopify-${brand.id}`] ? 'Disconnecting...' : 'Disconnect'}
                                </Button>
                              </div>
                            </TooltipTrigger>
                            {!canManagePlatforms && (
                              <TooltipContent>
                                <p>Permission check failed - see console for debug info</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-xs text-gray-400 font-medium">Not connected</span>
                        </div>
                        <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={!canManagePlatforms ? "cursor-not-allowed" : ""}>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); canManagePlatforms && onConnect('shopify', brand.id); }}
                                        disabled={!canManagePlatforms}
                                        className={cn(
                                          "text-black text-xs py-1 px-2 rounded-md shadow-lg",
                                          canManagePlatforms 
                                            ? "bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300" 
                                            : "bg-gray-500 opacity-50 pointer-events-none"
                                        )}
                                      >
                                        Connect
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!canManagePlatforms && (
                                    <TooltipContent>
                                      <p>Permission check failed - see console for debug info</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                          
                        </div>
                        </>
                      )}
                    </div>
                  </div>

                {/* Shopify App Installation Information */}
                <div className="border-t border-[#333] p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-400">
                      <p className="mb-1">
                        <span className="font-medium text-gray-300">API Connection:</span> Connect our API to your Shopify store to automatically sync orders, customers, and product data.
                      </p>
                      <p className="text-amber-400 text-xs mb-1">⚠️ Requires: Store admin access or brand owner credentials to authorize read-only permissions.</p>
                      <p>Provides real-time analytics with secure, automated data reporting.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-[#333]">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <img src="/meta-icon.png" alt="Meta" className="w-6 h-6" />
                    <div>
                      <span className="text-white font-medium text-sm">Meta</span>
                      <p className="text-xs text-gray-400">Facebook & Instagram Ads</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Show syncing state if actively connecting, regardless of connection status */}
                    {isMetaSyncing && isMetaConnecting ? (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-block">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled
                                  className="text-black text-xs py-1 px-2 rounded-md shadow-lg bg-blue-200 opacity-75 pointer-events-none"
                                >
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  Syncing
                                </Button>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div className="space-y-2">
                                <p className="font-medium">🔄 Syncing Meta Data</p>
                                <p className="text-sm">Importing all historical campaign data, demographics, and insights</p>
                                <p className="text-xs text-muted-foreground">
                                  ⏱️ Usually takes 3-5 minutes for full historical backfill
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : metaConnection && metaConnectionInfo ? (
                      <>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            metaConnectionInfo.isExpired ? 'bg-red-400' : 
                            metaConnectionInfo.isExpiring ? 'bg-yellow-400' : 'bg-green-400'
                          }`}></div>
                          <span className={`text-xs font-medium ${
                            metaConnectionInfo.isExpired ? 'text-red-400' : 
                            metaConnectionInfo.isExpiring ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {metaConnectionInfo.isExpired ? 'Expired' : 
                             metaConnectionInfo.isExpiring ? `${metaConnectionInfo.daysUntilExpiration}d left` : 'Connected'}
                          </span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <div className={`w-1 h-6 rounded-full ${
                                metaConnectionInfo.isExpired ? 'bg-red-400' : 
                                metaConnectionInfo.isExpiring ? 'bg-yellow-400' : 'bg-green-400'
                              }`}></div>
                              <div className={`w-1 h-6 rounded-full ${
                                metaConnectionInfo.isExpired ? 'bg-red-400' : 
                                metaConnectionInfo.isExpiring ? 'bg-yellow-400' : 'bg-green-400'
                              }`}></div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#1a1a1a] border-[#333] text-white p-3 max-w-xs">
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">Connected: {metaConnectionInfo.createdAt.toLocaleDateString()}</p>
                              <p>Expires: {metaConnectionInfo.expirationDate.toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">Meta tokens expire every 60 days for security</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={!canManagePlatforms ? "cursor-not-allowed" : ""}>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); canManagePlatforms && onDisconnect('meta', brand.id); }}
                                  disabled={disconnectingPlatforms[`meta-${brand.id}`] || !canManagePlatforms}
                                  className={cn(
                                    "border-[#444] bg-[#0f0f0f] text-gray-400 text-xs py-1 px-2 rounded-md",
                                    canManagePlatforms ? "hover:bg-[#333] hover:text-gray-300" : "opacity-50 pointer-events-none"
                                  )}
                                >
                                  {disconnectingPlatforms[`meta-${brand.id}`] ? 'Disconnecting...' : 'Disconnect'}
                                </Button>
                              </div>
                            </TooltipTrigger>
                            {!canManagePlatforms && (
                              <TooltipContent>
                                <p>Permission check failed - see console for debug info</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                        
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-xs text-gray-400 font-medium">Not connected</span>
                        </div>
                        <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={!canManagePlatforms ? "cursor-not-allowed" : ""}>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => { e.stopPropagation(); canManagePlatforms && onConnect('meta', brand.id); }}
                                        disabled={!canManagePlatforms}
                                        className={cn(
                                          "text-black text-xs py-1 px-2 rounded-md shadow-lg",
                                          canManagePlatforms 
                                            ? "bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300" 
                                            : "bg-gray-500 opacity-50 pointer-events-none"
                                        )}
                                      >
                                        Connect
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!canManagePlatforms && (
                                    <TooltipContent>
                                      <p>Permission check failed - see console for debug info</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                        </div>
                        
                      </>
                    )}
                  </div>
                </div>


                {/* Meta Integration Information */}
                <div className="border-t border-[#333] p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-400">
                      <p className="mb-1">
                        <span className="font-medium text-gray-300">API Connection:</span> Connect our API to your Meta Business account to automatically sync ad campaign data, ROAS metrics, and conversion tracking.
                      </p>
                      <p className="text-amber-400 text-xs mb-1">⚠️ Requires: Meta Business account ownership or admin access and Meta Pixel configured in your account for conversion data.</p>
                      <p className="mb-1">Provides real-time campaign performance with automated ad spend and revenue reporting.</p>
                      <p className="text-blue-400 text-xs">📊 Initial sync imports the last 90 days of data - all your system needs to start optimizing campaigns.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
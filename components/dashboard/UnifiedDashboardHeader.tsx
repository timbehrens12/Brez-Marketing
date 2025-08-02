"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/DateRangePicker"
import { GlobalRefreshButton } from "@/components/dashboard/GlobalRefreshButton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ClipboardList } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useActionCenter } from '@/hooks/useActionCenter'
import { useAuth } from '@clerk/nextjs'

interface UnifiedDashboardHeaderProps {
  activeTab: string
  onTabChange: (tab: string) => void
  dateRange: { from: Date; to: Date }
  setDateRange: (range: { from: Date; to: Date } | undefined) => void
  selectedBrandId: string | null
  activePlatforms: {
    meta: boolean
    shopify: boolean
  }
  isEditMode?: boolean
  setIsEditMode?: (mode: boolean) => void
  agencyName?: string | null
  agencyLogo?: string | null
  brandName?: string | null
}

export function UnifiedDashboardHeader({
  activeTab,
  onTabChange,
  dateRange,
  setDateRange,
  selectedBrandId,
  activePlatforms,
  isEditMode = false,
  setIsEditMode,
  agencyName,
  agencyLogo,
  brandName
}: UnifiedDashboardHeaderProps) {
  
  // Load muted notifications for action center
  const { userId } = useAuth()
  const [mutedNotifications, setMutedNotifications] = useState<{[key: string]: boolean}>({})
  
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`mutedNotifications_${userId}`)
      if (saved) {
        try {
          setMutedNotifications(JSON.parse(saved))
        } catch (error) {
          console.error('Error loading muted notifications:', error)
        }
      }
    }
  }, [userId])
  
  // Get notification counts for agency tab badge
  const { actionCenterCounts } = useActionCenter(mutedNotifications)
  
  // Debug: Log the counts in header to see why clipboard badge is missing
  useEffect(() => {
    if (actionCenterCounts.totalItems > 0) {
      console.log('[UnifiedDashboardHeader] 📱 Has notifications:', actionCenterCounts.totalItems, 'total items')
    } else {
      console.log('[UnifiedDashboardHeader] 📱 No notifications to show')
    }
  }, [actionCenterCounts.totalItems])

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] backdrop-blur-xl border-b border-[#222] shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-8 py-4">
        
        {/* Main Row - Branding, Platform Selector & Actions */}
        <div className="flex items-center justify-between">
          {/* Left: Agency Logo & Name with Brand - Pushed further right */}
          <div className="flex items-center gap-3 ml-12">
            {agencyLogo && (
              <div className="w-14 h-14 bg-[#2A2A2A] border border-[#333] rounded-xl flex items-center justify-center relative">
                <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
                <img 
                  src={agencyLogo} 
                  alt={`${agencyName} Logo`} 
                  className="w-10 h-10 object-contain rounded"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {agencyName || "Dashboard"}
                </h1>
                {brandName && (
                  <>
                    <span className="text-white text-xl">•</span>
                    <span className="text-sm text-gray-400 font-medium">
                      {brandName}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-400">
                {new Date().getHours() < 12 
                  ? "Good morning" 
                  : new Date().getHours() < 17 
                    ? "Good afternoon" 
                    : "Good evening"}! Let's optimize your campaigns.
              </p>
            </div>
          </div>

          {/* Center: Platform Selector Tabs - Absolutely centered */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <TooltipProvider>
              <Tabs value={activeTab} onValueChange={onTabChange} className="bg-transparent">
                <TabsList className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] p-2 h-16 rounded-2xl backdrop-blur-lg">
                  {/* Agency Tab */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="agency"
                          className={cn(
                            "relative group rounded-xl w-16 h-10 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            activeTab === "agency" 
                              ? "bg-gray-600/30 text-white shadow-md" 
                              : "hover:bg-gray-700/30 hover:text-gray-200"
                          )}
                        >
                          <div className="flex items-center justify-center relative">
                            <div className={cn(
                              "relative w-6 h-6 flex items-center justify-center z-10",
                              activeTab === "agency" 
                                ? "text-white" 
                                : "text-gray-400 group-hover:text-gray-200"
                            )}>
                              <ClipboardList size={26} className="drop-shadow-md" />
                            </div>
                                        {/* Notification badge */}
            {actionCenterCounts.totalItems > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-gray-800 z-20">
                {actionCenterCounts.totalItems > 99 ? '99+' : actionCenterCounts.totalItems}
              </div>
            )}
                          </div>
                          {activeTab === "agency" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                          )}
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
                        <p>Agency Management</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Shopify Tab */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="shopify"
                          disabled={!activePlatforms.shopify}
                          className={cn(
                            "relative group rounded-xl w-20 h-12 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            activeTab === "shopify" 
                              ? "bg-gray-600/30 text-white shadow-md" 
                              : "hover:bg-gray-700/30 hover:text-gray-200",
                            !activePlatforms.shopify && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "relative w-8 h-8 flex items-center justify-center z-10",
                              activeTab === "shopify" 
                                ? "text-white" 
                                : "text-gray-400 group-hover:text-gray-200"
                            )}>
                              <Image 
                                src="https://i.imgur.com/cnCcupx.png" 
                                alt="Shopify" 
                                width={28} 
                                height={28} 
                                className="object-contain drop-shadow-md"
                              />
                            </div>
                          </div>
                          {activeTab === "shopify" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                          )}
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
                        <p>Shopify Analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Meta Tab */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="meta"
                          disabled={!activePlatforms.meta}
                          className={cn(
                            "relative group rounded-xl w-20 h-12 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            activeTab === "meta" 
                              ? "bg-gray-600/30 text-white shadow-md" 
                              : "hover:bg-gray-700/30 hover:text-gray-200",
                            !activePlatforms.meta && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "relative w-8 h-8 flex items-center justify-center z-10",
                              activeTab === "meta" 
                                ? "text-white" 
                                : "text-gray-400 group-hover:text-gray-200"
                            )}>
                              <Image 
                                src="https://i.imgur.com/VAR7v4w.png" 
                                alt="Meta" 
                                width={31} 
                                height={31} 
                                className="object-contain drop-shadow-md"
                              />
                            </div>
                          </div>
                          {activeTab === "meta" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400/50 rounded-full"></div>
                          )}
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
                        <p>Meta Analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* TikTok Tab */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="tiktok"
                          disabled={true}
                          className={cn(
                            "relative group rounded-xl w-16 h-10 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "relative w-6 h-6 flex items-center justify-center z-10",
                              "text-gray-400"
                            )}>
                              <Image 
                                src="https://i.imgur.com/AXHa9UT.png" 
                                alt="TikTok" 
                                width={31} 
                                height={31} 
                                className="object-contain drop-shadow-md"
                              />
                            </div>
                          </div>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
                        <p>TikTok Analytics (Coming Soon)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Google Ads Tab */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="google"
                          disabled={true}
                          className={cn(
                            "relative group rounded-xl w-16 h-10 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "relative w-6 h-6 flex items-center justify-center z-10",
                              "text-gray-400"
                            )}>
                              <Image 
                                src="https://i.imgur.com/TavV4UJ.png" 
                                alt="Google Ads" 
                                width={31} 
                                height={31} 
                                className="object-contain drop-shadow-md"
                              />
                            </div>
                          </div>
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs">
                        <p>Google Ads (Coming Soon)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TabsList>
              </Tabs>
            </TooltipProvider>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            {selectedBrandId && (activePlatforms.meta || activePlatforms.shopify) && (
              <GlobalRefreshButton 
                brandId={selectedBrandId} 
                activePlatforms={activePlatforms}
                currentTab={activeTab}
              />
            )}

            {/* Date Range Picker */}
            <DateRangePicker
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
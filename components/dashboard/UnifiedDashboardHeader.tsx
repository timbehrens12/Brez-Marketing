"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/DateRangePicker"
import { GlobalRefreshButton } from "@/components/dashboard/GlobalRefreshButton"
// import { SyncStatusWidget } from "@/components/shopify/SyncStatusWidget" // Disabled until V2 integration
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ClipboardList } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

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
  isDateRangeLoading?: boolean
  connections?: any[]
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
  brandName,
  isDateRangeLoading = false,
  connections = []
}: UnifiedDashboardHeaderProps) {
  


  return (
    <div className="sticky top-0 z-40 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] backdrop-blur-xl border-b border-[#222] shadow-2xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-4">
        
        {/* Main Row - Better mobile spacing to prevent widget smashing */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 lg:gap-4">
          {/* Top Row on Mobile: Agency Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            {agencyLogo && (
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-[#2A2A2A] border border-[#333] rounded-xl flex items-center justify-center relative">
                <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
                <img 
                  src={agencyLogo} 
                  alt={`${agencyName} Logo`} 
                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 object-contain rounded"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-white tracking-tight truncate">
                  {agencyName || "Dashboard"}
                </h1>
                {brandName && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="hidden sm:inline text-white text-sm lg:text-lg xl:text-xl flex-shrink-0">•</span>
                    <span className="text-xs sm:text-sm text-gray-400 font-medium truncate">
                      {brandName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Platform Selector Tabs - Responsive centered */}
          <div className="hidden sm:block absolute left-1/2 transform -translate-x-1/2">
            <TooltipProvider delayDuration={300}>
              <Tabs value={activeTab} onValueChange={onTabChange} className="bg-transparent">
                <TabsList className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] p-2 h-16 rounded-2xl backdrop-blur-lg">
                  {/* Agency Tab */}
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

                  {/* Shopify Tab */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="shopify"
                          className={cn(
                            "relative group rounded-xl w-20 h-12 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            activeTab === "shopify" 
                              ? "bg-gray-600/30 text-white shadow-md" 
                              : activePlatforms.shopify 
                                ? "hover:bg-gray-700/30 hover:text-gray-200"
                                : "",
                            !activePlatforms.shopify && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={(e) => {
                            if (!activePlatforms.shopify) {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        >
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "relative w-8 h-8 flex items-center justify-center z-10",
                              activeTab === "shopify" 
                                ? "text-white" 
                                : activePlatforms.shopify
                                  ? "text-gray-400 group-hover:text-gray-200"
                                  : "text-gray-400"
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
                        <p>{!activePlatforms.shopify 
                          ? selectedBrandId 
                            ? "No Shopify connection found" 
                            : "Select a brand to access Shopify Analytics"
                          : "Shopify Analytics"
                        }</p>
                      </TooltipContent>
                    </Tooltip>

                  {/* Meta Tab */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="meta"
                          className={cn(
                            "relative group rounded-xl w-20 h-12 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            activeTab === "meta" 
                              ? "bg-gray-600/30 text-white shadow-md" 
                              : activePlatforms.meta 
                                ? "hover:bg-gray-700/30 hover:text-gray-200"
                                : "",
                            !activePlatforms.meta && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={(e) => {
                            if (!activePlatforms.meta) {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        >
                          <div className="flex items-center justify-center">
                            <div className={cn(
                              "relative w-8 h-8 flex items-center justify-center z-10",
                              activeTab === "meta" 
                                ? "text-white" 
                                : activePlatforms.meta
                                  ? "text-gray-400 group-hover:text-gray-200"
                                  : "text-gray-400"
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
                        <p>{!activePlatforms.meta 
                          ? selectedBrandId 
                            ? "No Meta connection found" 
                            : "Select a brand to access Meta Analytics"
                          : "Meta Analytics"
                        }</p>
                      </TooltipContent>
                    </Tooltip>

                  {/* TikTok Tab */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="tiktok"
                          className={cn(
                            "relative group rounded-xl w-16 h-10 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            "opacity-50 cursor-not-allowed"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
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

                  {/* Google Ads Tab */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                        <TabsTrigger 
                          value="google"
                          className={cn(
                            "relative group rounded-xl w-16 h-10 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                            "opacity-50 cursor-not-allowed"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
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
                </TabsList>
              </Tabs>
            </TooltipProvider>
          </div>

          {/* Right: Actions - Better mobile spacing */}
          <div className="flex items-center justify-between xl:justify-end gap-2 sm:gap-3 flex-shrink-0 mt-2 xl:mt-0">
            {/* Date Range Picker - More space on mobile */}
            <div className="flex-1 xl:flex-initial min-w-0 max-w-[280px] sm:max-w-none">
              <DateRangePicker
                dateRange={dateRange}
                setDateRange={setDateRange}
                disabled={isDateRangeLoading}
              />
            </div>
            
            {/* Refresh Button - always show for agency tab, require brand for others */}
            {(activeTab === "agency" || (selectedBrandId && (activePlatforms.meta || activePlatforms.shopify))) && (
              <div className="flex-shrink-0">
                <GlobalRefreshButton 
                  brandId={selectedBrandId || ""} 
                  activePlatforms={activePlatforms}
                  currentTab={activeTab}
                  connections={connections}
                  dateRange={dateRange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Platform Tabs Row */}
        <div className="sm:hidden mt-4">
          <TooltipProvider delayDuration={300}>
            <Tabs value={activeTab} onValueChange={onTabChange} className="bg-transparent">
              <TabsList className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] p-2 h-12 rounded-xl backdrop-blur-lg w-full justify-center">
                {/* Agency Tab - Mobile */}
                <TabsTrigger 
                  value="agency"
                  className={cn(
                    "relative group rounded-lg flex-1 h-8 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                    activeTab === "agency" 
                      ? "bg-gray-600/30 text-white shadow-md" 
                      : "hover:bg-gray-700/30 hover:text-gray-200"
                  )}
                >
                  <div className="flex items-center justify-center relative">
                    <ClipboardList size={20} />
                  </div>
                </TabsTrigger>

                {/* Shopify Tab - Mobile */}
                <TabsTrigger 
                  value="shopify"
                  className={cn(
                    "relative group rounded-lg flex-1 h-8 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                    activeTab === "shopify" 
                      ? "bg-gray-600/30 text-white shadow-md" 
                      : "hover:bg-gray-700/30 hover:text-gray-200",
                    !activePlatforms.shopify && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={(e) => {
                    if (!activePlatforms.shopify) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <Image 
                    src="https://i.imgur.com/cnCcupx.png" 
                    alt="Shopify" 
                    width={20} 
                    height={20} 
                    className="object-contain"
                  />
                </TabsTrigger>

                {/* Meta Tab - Mobile */}
                <TabsTrigger 
                  value="meta"
                  className={cn(
                    "relative group rounded-lg flex-1 h-8 text-gray-400 transition-all duration-200 ease-out overflow-hidden",
                    activeTab === "meta" 
                      ? "bg-gray-600/30 text-white shadow-md" 
                      : "hover:bg-gray-700/30 hover:text-gray-200",
                    !activePlatforms.meta && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={(e) => {
                    if (!activePlatforms.meta) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  <Image 
                    src="https://i.imgur.com/VAR7v4w.png" 
                    alt="Meta" 
                    width={20} 
                    height={20} 
                    className="object-contain"
                  />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </TooltipProvider>
        </div>

        {/* Mobile: Date Range Picker */}
        <div className="sm:hidden mt-3">
          <DateRangePicker
            dateRange={dateRange}
            setDateRange={setDateRange}
            disabled={isDateRangeLoading}
          />
        </div>

        {/* Sync Status Widget - Disabled until V2 integration complete */}
        {false && selectedBrandId && activePlatforms.shopify && (
          <div className="mt-4">
            <SyncStatusWidget 
              brandId={selectedBrandId}
              className="max-w-md"
              showDetails={false}
            />
          </div>
        )}

      </div>
    </div>
  )
}
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut, FileText, Sparkles, BrainCircuit, Send, Palette, Zap, Globe, Settings2, ClipboardList, FileBarChart, Pin, PinOff } from "lucide-react"
import { useAuth, useClerk, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import BrandSelector from "@/components/BrandSelector"
import OverlaidBrandLogos from "@/components/OverlaidBrandLogos"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAgency } from "@/contexts/AgencyContext"
import { useActionCenter } from "@/hooks/useActionCenter"
import { useState, useEffect } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

const navItems = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    description: "Marketing overview"
  },
  { 
    name: "Action Center", 
    href: "/action-center", 
    icon: ClipboardList,
    description: "Track tasks and priorities"
  },
  { 
    name: "Marketing Assistant", 
    href: "/marketing-assistant", 
    icon: BrainCircuit,
    description: "AI marketing insights"
  },
  { 
    name: "Brand Report", 
    href: "/brand-report", 
    icon: FileBarChart,
    description: "Brand analytics"
  },
  { 
    name: "Lead Generator", 
    href: "/lead-generator", 
    icon: Zap,
    description: "Find and qualify leads"
  },
  { 
    name: "Outreach Tool", 
    href: "/outreach-tool", 
    icon: Send,
    description: "Manage lead outreach"
  },
  { 
    name: "Ad Creative Studio", 
    href: "/ad-creative-studio", 
    icon: Palette,
    description: "Create ad content",
    comingSoon: true
  },
  { 
    name: "Settings", 
    href: "/settings", 
    icon: Settings,
    description: "Account settings"
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { userId, isLoaded } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const { selectedBrandId, setSelectedBrandId } = useBrandContext()
  const { agencySettings, isLoading: agencyLoading } = useAgency()
  // Load muted notifications for action center
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

  const { actionCenterCounts } = useActionCenter(mutedNotifications)
  
  // Apply muting filter to the counts for display
  const getFilteredCounts = () => {
    let filteredTotal = actionCenterCounts.totalItems
    let filteredUrgent = actionCenterCounts.urgentItems
    
    // Get the breakdown from action center to apply proper filtering
    const { outreachTodos = 0, urgentOutreach = 0, brandReports = 0, availableTools = 0 } = actionCenterCounts.breakdown || {}
    
    // If outreach-tasks is muted, subtract actual outreach counts
    if (mutedNotifications['outreach-tasks']) {
      filteredTotal = Math.max(0, filteredTotal - outreachTodos)
      filteredUrgent = Math.max(0, filteredUrgent - urgentOutreach)
    }
    
    // If available-tools is muted, subtract actual tool counts
    if (mutedNotifications['available-tools']) {
      filteredTotal = Math.max(0, filteredTotal - availableTools)
    }
    
    // Only log when counts actually change to reduce noise
    const shouldLog = filteredTotal !== 0 || filteredUrgent !== 0 || Object.keys(mutedNotifications).length > 0
    if (shouldLog) {
      console.log('[Sidebar] Filtering notification counts:', {
        original: actionCenterCounts,
        breakdown: { outreachTodos, urgentOutreach, brandReports, availableTools },
        muted: mutedNotifications,
        filtered: { totalItems: filteredTotal, urgentItems: filteredUrgent }
      })
    }
    
    return { totalItems: filteredTotal, urgentItems: filteredUrgent }
  }
  
  const filteredCounts = getFilteredCounts()
  
  // Sidebar state - always collapsed by default, expand on hover or when pinned
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // Load pinned state from localStorage on mount (user-specific)
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`sidebar-pinned-${userId}`)
      if (saved !== null) {
        setIsPinned(JSON.parse(saved))
      }
    }
  }, [userId])
  
  // Save pinned state to localStorage (user-specific)
  const togglePinned = () => {
    if (userId) {
      const newState = !isPinned
      setIsPinned(newState)
      localStorage.setItem(`sidebar-pinned-${userId}`, JSON.stringify(newState))
    }
  }
  
  // Determine if sidebar should show expanded content
  const showExpanded = isPinned || isHovered
  
  // If auth is not loaded yet or user is not authenticated, render a simplified sidebar
  if (!isLoaded || !userId) {
    return (
      <aside 
        className={cn(
          "bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden transition-all duration-300",
          showExpanded ? "w-64" : "w-20",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo Section */}
                 <div className="p-4 flex items-center justify-center">
           <div className="w-14 h-14 bg-[#2A2A2A] border border-[#333] rounded-xl flex items-center justify-center relative">
            <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
                         {agencyLoading ? (
               <div className="w-10 h-10 animate-pulse bg-[#444] rounded"></div>
             ) : agencySettings.agency_logo_url ? (
               <img 
                 src={agencySettings.agency_logo_url} 
                 alt={`${agencySettings.agency_name} Logo`} 
                 className="w-10 h-10 object-contain rounded" 
               />
             ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
               <span className="text-white font-bold text-xl">
                 {agencySettings.agency_name.slice(0, 2).toUpperCase()}
               </span>
             ) : (
               <div className="w-10 h-10 rounded" style={{backgroundColor: '#3a3a3a'}}></div>
             )}
          </div>
        </div>
        
        <div className="border-t border-[#2A2A2A] mx-4 mb-6"></div>
        
        <div className="flex-1 px-2">
          <nav className="space-y-3 opacity-50">
                         <div className="flex items-center justify-center p-3 bg-[#2A2A2A] text-white rounded-lg">
               <LayoutDashboard className="h-5 w-5" />
             </div>
          </nav>
        </div>
        
        <div className="p-4 mt-auto border-t border-[#2A2A2A] flex justify-center">
                     <Button
             variant="ghost"
             size="sm"
             className="w-12 h-12 p-0 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg"
             disabled
           >
             <LogOut className="h-5 w-5" />
           </Button>
        </div>
      </aside>
    )
  }

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId);
    
    // Dispatch a custom event to notify components that need to refresh their data
    const event = new CustomEvent("brandSelected", { 
      detail: { brandId } 
    });
    window.dispatchEvent(event);
    
    // If we're on a page that needs the brandId in the URL, redirect to dashboard
    if (pathname.includes("/dashboard/") && !pathname.includes(brandId)) {
      router.push("/dashboard");
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <aside 
        className={cn(
          "bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out relative",
          showExpanded ? "w-64" : "w-20",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Pin Button - only show when expanded */}
        {showExpanded && (
          <div className="absolute top-4 right-4 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePinned}
                  className="h-8 w-8 p-0 hover:bg-[#2A2A2A] rounded-lg"
                >
                  {isPinned ? (
                    <PinOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Pin className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isPinned ? "Unpin sidebar" : "Pin sidebar open"}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Logo Section */}
        <div className="p-4 flex items-center justify-center">
                     <div className={cn(
             "bg-[#2A2A2A] border border-[#333] rounded-xl flex items-center relative transition-all duration-300",
             showExpanded ? "w-full p-3" : "w-14 h-14 justify-center"
           )}>
            <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
            
                         <div className={cn("flex-shrink-0", showExpanded ? "ml-2" : "")}>
              <OverlaidBrandLogos 
                agencySettings={agencySettings}
                agencyLoading={agencyLoading}
                showExpanded={showExpanded}
                maxVisibleBrands={4}
              />
             </div>
            
            {showExpanded && (
              <div className="flex-1 min-w-0 ml-3 transition-opacity duration-500 delay-200">
                <h3 className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                  {agencyLoading ? (
                    <div className="h-4 bg-[#444] rounded animate-pulse w-24"></div>
                  ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
                    agencySettings.agency_name
                  ) : (
                    "Agency"
                  )}
                </h3>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-[#2A2A2A] mx-4 mb-4"></div>
        
        {/* Brand Selector - smooth transition */}
        <div className={cn(
          "mb-4 transition-all duration-300 ease-in-out",
          showExpanded ? "px-6 opacity-100 max-h-20" : "px-0 opacity-0 max-h-0"
        )}>
          <div className={cn(
            "transition-all duration-300 ease-in-out",
            !showExpanded && "overflow-hidden"
          )}>
            <BrandSelector 
              onSelect={handleBrandSelect}
              selectedBrandId={selectedBrandId}
              className="w-full"
              isVisible={showExpanded}
            />
          </div>
        </div>
        
        <div className={cn("flex-1 transition-all duration-200", showExpanded ? "px-6" : "px-2")}>
          <nav className="space-y-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const isComingSoon = item.comingSoon;
              
              const linkElement = (
                <Link
                  key={item.name}
                  href={isComingSoon ? "#" : item.href}
                  className={cn(
                    "relative flex items-center rounded-lg transition-all duration-200 group",
                    isActive
                    ? "bg-[#2A2A2A] text-white" 
                    : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]",
                    isComingSoon && "cursor-not-allowed opacity-60",
                    showExpanded ? "px-3 py-3" : "p-3 justify-center"
                  )}
                  onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
                >
                    {/* Add the white indicator lip for active items */}
                    {isActive && (
                      <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
                    )}
                    <div className="flex items-center w-full">
                        <div className={cn("flex items-center relative", showExpanded ? "w-full" : "justify-center w-full")}>
                        <item.icon className="h-6 w-6 flex-shrink-0" />
                                                  {/* Notification dot for collapsed sidebar */}
                        {!showExpanded && item.name === "Action Center" && filteredCounts.totalItems > 0 && (
                          <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full text-xs flex items-center justify-center bg-white border border-[#444]">
                            <span className="text-[11px] font-bold leading-none px-1 text-black">
                              {filteredCounts.totalItems > 99 ? '99+' : filteredCounts.totalItems}
                            </span>
                          </div>
                        )}
                        {showExpanded && (
                          <div className="flex-1 min-w-0 ml-3 transition-opacity duration-200">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <div className="flex items-center gap-2">
                                {item.name === "Action Center" && actionCenterCounts.totalItems > 0 && (
                                  <Badge className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-white text-black border border-[#444]">
                                    {actionCenterCounts.totalItems}
                                  </Badge>
                                )}
                              {isComingSoon && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                                  Soon
                                </span>
                              )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{item.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                </Link>
              );

              // Wrap with tooltip only when collapsed
              if (!showExpanded) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      {linkElement}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <div>
                        <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                          {item.name === "Action Center" && filteredCounts.totalItems > 0 && (
                            <Badge className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-white text-black border border-[#444]">
                              {filteredCounts.totalItems}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{item.description}</p>
                        {item.name === "Action Center" && filteredCounts.totalItems > 0 && (
                          <p className="text-xs text-gray-300 mt-1">
                            {filteredCounts.urgentItems > 0 && `${filteredCounts.urgentItems} urgent • `}
                            {filteredCounts.totalItems} total items
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return linkElement;
            })}
          </nav>
        </div>
        
        <div className="p-4 mt-auto border-t border-[#2A2A2A]">
          <div className={cn("flex items-center transition-all duration-200", !showExpanded && "justify-center")}>
            {/* Custom non-clickable user profile display */}
            <div className="flex items-center justify-center">
              {user?.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={user.fullName || user.emailAddresses?.[0]?.emailAddress || "User"} 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user?.firstName?.charAt(0) || user?.fullName?.charAt(0) || "U"}
                  </span>
                </div>
              )}
            </div>
            {showExpanded && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 ml-2 justify-start text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-opacity duration-200"
                onClick={() => signOut(() => router.push("/dashboard"))}
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}


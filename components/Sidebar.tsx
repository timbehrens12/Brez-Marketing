"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut, FileText, Sparkles, BrainCircuit, Send, Palette, Globe, Settings2, ClipboardList, FileBarChart, Pin, PinOff, Building2, MessageCircle, Lock, Phone } from "lucide-react"
import { useAuth, useClerk, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import BrandSelector from "@/components/BrandSelector"
import OverlaidBrandLogos from "@/components/OverlaidBrandLogos"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAgency } from "@/contexts/AgencyContext"
import { useSidebar } from "@/context/SidebarContext"

import { useState, useEffect } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface NavItem {
  name: string;
  href: string;
  icon: any;
  description: string;
  comingSoon?: boolean;
}

const navItems: NavItem[] = [
  // Hidden pages - not deleted, just removed from sidebar
  // { 
  //   name: "Dashboard", 
  //   href: "/dashboard", 
  //   icon: LayoutDashboard,
  //   description: "Marketing overview"
  // },
  // { 
  //   name: "Marketing Assistant", 
  //   href: "/marketing-assistant", 
  //   icon: BrainCircuit,
  //   description: "AI marketing insights"
  // },
  // { 
  //   name: "AI Chatbot", 
  //   href: "/ai-marketing-consultant", 
  //   icon: MessageCircle,
  //   description: "Chat with AI assistant"
  // },
  // { 
  //   name: "Brand Report", 
  //   href: "/brand-report", 
  //   icon: FileBarChart,
  //   description: "Brand analytics"
  // },
  // { 
  //   name: "Ad Creative Studio", 
  //   href: "/ad-creative-studio", 
  //   icon: Palette,
  //   description: "Create ad designs"
  // },
  // { 
  //   name: "Settings", 
  //   href: "/settings", 
  //   icon: Settings,
  //   description: "Account settings"
  // },

  { 
    name: "Lead Generator", 
    href: "/lead-generator", 
    icon: Users,
    description: "Find and qualify leads"
  },
  { 
    name: "Outreach Tool", 
    href: "/outreach-tool", 
    icon: Send,
    description: "Manage lead outreach"
  },
  { 
    name: "Objection Handler", 
    href: "/objection-handler", 
    icon: Phone,
    description: "AI sales objection responses"
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
  const { setIsExpanded } = useSidebar()

  // Track locked features based on tier
  const [lockedFeatures, setLockedFeatures] = useState<Record<string, boolean>>({})
  
  // Check tier access for features
  useEffect(() => {
    async function checkFeatureAccess() {
      if (!userId) return
      
      try {
        // Check Lead Generator access
        const leadGenResponse = await fetch('/api/tier/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature: 'lead_generation' })
        })
        const leadGenData = await leadGenResponse.json()
        
        // Check Outreach Tool access
        const outreachResponse = await fetch('/api/tier/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feature: 'outreach_tool' })
        })
        const outreachData = await outreachResponse.json()
        
        setLockedFeatures({
          '/lead-generator': !leadGenData.allowed,
          '/outreach-tool': !outreachData.allowed
        })
      } catch (error) {
        console.error('Error checking feature access:', error)
      }
    }
    
    checkFeatureAccess()
  }, [userId])

  
  // Sidebar state - always collapsed by default, expand on hover or when pinned
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [hoverTimeoutId, setHoverTimeoutId] = useState<NodeJS.Timeout | null>(null)
  
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
  
  // Debounced hover handlers to prevent flickering during navigation
  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId)
      setHoverTimeoutId(null)
    }
    // Immediately set hover state
    setIsHovered(true)
  }
  
  const handleMouseLeave = () => {
    // Clear any existing timeout
    if (hoverTimeoutId) {
      clearTimeout(hoverTimeoutId)
    }
    // Add a small delay before collapsing to prevent flickering during navigation
    const timeoutId = setTimeout(() => {
      setIsHovered(false)
      setHoverTimeoutId(null)
    }, 150) // 150ms delay to allow for navigation transitions
    setHoverTimeoutId(timeoutId)
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId)
      }
    }
  }, [hoverTimeoutId])
  
  // Determine if sidebar should show expanded content
  const showExpanded = isPinned || isHovered
  
  // Dispatch custom events when sidebar expansion state changes (including initial state)
  useEffect(() => {
    setIsExpanded(showExpanded)
  }, [showExpanded, setIsExpanded])
  
  // If auth is not loaded yet or user is not authenticated, render a simplified sidebar
  if (!isLoaded || !userId) {
    return (
      <aside 
        className={cn(
          "border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden transition-all duration-300 z-50",
          showExpanded ? "w-64" : "w-20",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          background: `rgba(128,128,128,0.15)`,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          `)}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '40px 40px',
          backgroundAttachment: 'fixed'
        }}
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
        
        <div className={cn(
          "border-t border-[#2A2A2A] mb-6",
          showExpanded ? "mx-4" : "mx-0"
        )}></div>
        
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
          "border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out relative z-50",
          showExpanded ? "w-64" : "w-20",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          background: `#1a1a1a`,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          `)}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '40px 40px',
          backgroundAttachment: 'fixed'
        }}
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
        <div className="p-4">
          <div className={cn(
            "bg-[#2A2A2A] border border-[#333] rounded-xl transition-all duration-300 relative",
            showExpanded ? "w-full p-3" : "w-14 h-14 flex items-center justify-center mx-auto"
          )}>
            <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
            
            {!showExpanded ? (
              // Collapsed view - just agency logo with brand count
              <div className="relative">
                <OverlaidBrandLogos 
                  agencySettings={agencySettings}
                  agencyLoading={agencyLoading}
                  showExpanded={false}
                  maxVisibleBrands={4}
                />
              </div>
            ) : (
              // Expanded view - agency logo, name, and brand icons
              <div className="flex items-center gap-3 w-full">
                {/* Agency logo */}
                <div className="flex-shrink-0 ml-2">
                  {agencyLoading ? (
                    <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 animate-pulse bg-[#444] rounded"></div>
                    </div>
                  ) : agencySettings.agency_logo_url ? (
                    <div className="w-10 h-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-2 overflow-hidden">
                      <img 
                        src={agencySettings.agency_logo_url} 
                        alt={`${agencySettings.agency_name} Logo`} 
                        className="w-6 h-6 object-contain rounded" 
                      />
                    </div>
                  ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
                    <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {agencySettings.agency_name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#3a3a3a'}}>
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Agency name and brand icons column - Fixed height container */}
                <div className="flex-1 min-w-0 flex flex-col h-10 justify-center overflow-hidden pr-2">
                  <div className="h-4 overflow-hidden">
                    <h3 className="text-xs font-semibold text-white leading-tight truncate">
                      {agencyLoading ? (
                        <div className="h-4 bg-[#444] rounded animate-pulse w-24"></div>
                      ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
                        agencySettings.agency_name
                      ) : (
                        "Agency"
                      )}
                    </h3>
                  </div>
                  
                  {/* Brand icons directly under agency name - Fixed height */}
                  <div className="h-4 mt-1 overflow-hidden">
                    <OverlaidBrandLogos 
                      agencySettings={agencySettings}
                      agencyLoading={agencyLoading}
                      showExpanded={true}
                      maxVisibleBrands={6}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={cn(
          "border-t border-[#2A2A2A] mb-4",
          showExpanded ? "mx-4" : "mx-0"
        )}></div>
        
        {/* Brand Selector - hidden for now */}
        
        <div className={cn("flex-1 transition-all duration-200", showExpanded ? "px-6" : "px-2")}>
          <nav className="space-y-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const isComingSoon = item.comingSoon ?? false;
              const isLocked = lockedFeatures[item.href] || false;
              
              const linkElement = (
                <Link
                  key={item.name}
                  href={isComingSoon ? "#" : item.href}
                  className={cn(
                    "relative flex items-center rounded-lg transition-all duration-200 group",
                    isActive
                    ? "bg-[#2A2A2A] text-white shadow-[0_0_20px_rgba(255,42,42,0.4),inset_0_0_20px_rgba(255,42,42,0.1)]" 
                    : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]",
                    isComingSoon && "cursor-not-allowed opacity-60",
                    isLocked && "opacity-50",
                    showExpanded ? "px-3 py-3" : "p-3 justify-center"
                  )}
                  onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
                >
                    {/* Add the red indicator lip for active items */}
                    {isActive && (
                      <div className="absolute left-0 inset-y-2 w-1 bg-[#FF2A2A] rounded-full"></div>
                    )}
                    <div className="flex items-center w-full">
                        <div className={cn("flex items-center relative", showExpanded ? "w-full" : "justify-center w-full")}>
                        <div className="relative">
                          <item.icon className="h-6 w-6 flex-shrink-0" />
                          {isLocked && (
                            <Lock className="h-3 w-3 absolute -bottom-1 -right-1 text-[#FF2A2A]" />
                          )}
                        </div>

                        <div className={cn(
                          "overflow-hidden transition-all duration-300 ease-out",
                          showExpanded ? "w-40 opacity-100" : "w-0 opacity-0"
                        )}>
                          <div className="ml-3 w-40">
                            <div className="flex items-center justify-between h-5">
                              <p className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                              {isComingSoon && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full whitespace-nowrap">
                                  Soon
                                </span>
                              )}
                              {isLocked && (
                                  <Lock className="h-3 w-3 text-[#FF2A2A]" />
                              )}
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis h-4 leading-4">{item.description}</p>
                          </div>
                        </div>
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
                        </div>
                        <p className="text-xs text-gray-400">{item.description}</p>

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
                onClick={async () => {
                  try {
                    await signOut()
                    window.location.href = "/sign-in"
                  } catch (error) {
                    window.location.href = "/sign-in"
                  }
                }}
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

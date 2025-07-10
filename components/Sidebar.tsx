"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut, FileText, Sparkles, BrainCircuit, Send, Palette, Zap, Globe, Settings2, ClipboardList, FileBarChart, ChevronLeft, ChevronRight } from "lucide-react"
import { UserButton, useAuth, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import BrandSelector from "@/components/BrandSelector"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAgency } from "@/contexts/AgencyContext"
import { useState, useEffect } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: LayoutDashboard,
    description: "Marketing overview"
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
    name: "Site Optimizer", 
    href: "/site-optimizer", 
    icon: Globe,
    description: "Optimize website",
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
  const { signOut } = useClerk()
  const router = useRouter()
  const { selectedBrandId, setSelectedBrandId } = useBrandContext()
  const { agencySettings, isLoading: agencyLoading } = useAgency()
  
  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])
  
  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState))
  }
  
  // Determine if sidebar should show expanded content
  const showExpanded = !isCollapsed || isHovered
  
  // If auth is not loaded yet or user is not authenticated, render a simplified sidebar
  if (!isLoaded || !userId) {
    return (
      <aside 
        className={cn(
          "bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden transition-all duration-300",
          isCollapsed && !isHovered ? "w-16" : "w-64",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-4">
          <div className="relative bg-[#2A2A2A] border border-[#333] rounded-xl p-3 flex items-center space-x-3">
            {/* White accent line like active tabs */}
            <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
            
            <div className="flex-shrink-0 ml-2">
              {agencyLoading ? (
                <div className="h-10 w-10 bg-[#333] rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 animate-pulse bg-[#444] rounded"></div>
                </div>
              ) : agencySettings.agency_logo_url ? (
                <div className="h-10 w-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-1.5 overflow-hidden">
                  <img 
                    src={agencySettings.agency_logo_url} 
                    alt={`${agencySettings.agency_name} Logo`} 
                    className="max-w-full max-h-full object-contain rounded" 
                  />
                </div>
              ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
                <div className="h-10 w-10 bg-[#333] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {agencySettings.agency_name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#3a3a3a'}}>
                  {/* Gray placeholder square */}
                </div>
              )}
            </div>
            
            {showExpanded && (
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white break-words leading-tight tracking-wide">
                  {agencyLoading ? (
                    <div className="h-4 bg-[#444] rounded animate-pulse"></div>
                  ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
                    agencySettings.agency_name
                  ) : (
                    <div className="space-y-1">
                      <div className="h-3 rounded w-20" style={{backgroundColor: '#3a3a3a'}}></div>
                      <div className="h-2 rounded w-16" style={{backgroundColor: '#3a3a3a'}}></div>
                    </div>
                  )}
                </h3>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-[#2A2A2A] mb-6"></div>
        <div className={cn("flex-1", showExpanded ? "px-6" : "px-2")}>
          <nav className="space-y-0.5 opacity-50">
            <div
              className={cn(
                "flex items-center py-2 text-sm font-medium rounded-lg",
                "bg-[#2A2A2A] text-white",
                showExpanded ? "px-3" : "px-2 justify-center"
              )}
            >
              <LayoutDashboard className={cn("h-4 w-4", showExpanded && "mr-3")} />
              {showExpanded && "Dashboard"}
            </div>
          </nav>
        </div>
        <div className="p-4 mt-auto border-t border-[#2A2A2A]">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full text-gray-400 hover:text-white hover:bg-[#2A2A2A]",
              showExpanded ? "justify-start" : "justify-center px-2"
            )}
            disabled
          >
            <LogOut className={cn("h-4 w-4", showExpanded && "mr-3")} />
            {showExpanded && "Sign In"}
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
          "bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed && !isHovered ? "w-16" : "w-64",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Collapse Toggle Button */}
      <div className="absolute top-4 -right-3 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleCollapsed}
          className="h-6 w-6 p-0 bg-[#1A1A1A] border-[#333] hover:bg-[#2A2A2A] rounded-full"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-gray-400" />
          )}
        </Button>
      </div>

      <div className="p-4">
        <div className="relative bg-[#2A2A2A] border border-[#333] rounded-xl p-3 flex items-center space-x-3">
          {/* White accent line like active tabs */}
          <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
          
          <div className="flex-shrink-0 ml-2">
            {agencyLoading ? (
              <div className="h-10 w-10 bg-[#333] rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 animate-pulse bg-[#444] rounded"></div>
              </div>
            ) : agencySettings.agency_logo_url ? (
              <div className="h-10 w-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-1.5 overflow-hidden">
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings.agency_name} Logo`} 
                  className="max-w-full max-h-full object-contain rounded" 
                />
              </div>
            ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
              <div className="h-10 w-10 bg-[#333] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {agencySettings.agency_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#3a3a3a'}}>
                {/* Gray placeholder square */}
              </div>
            )}
          </div>
          
          {showExpanded && (
            <div className="flex-1 min-w-0 transition-opacity duration-200">
              <h3 className="text-sm font-semibold text-white break-words leading-tight tracking-wide">
                {agencyLoading ? (
                  <div className="h-4 bg-[#444] rounded animate-pulse"></div>
                ) : agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' ? (
                  agencySettings.agency_name
                ) : (
                  <div className="space-y-1">
                    <div className="h-3 rounded w-20" style={{backgroundColor: '#3a3a3a'}}></div>
                    <div className="h-2 rounded w-16" style={{backgroundColor: '#3a3a3a'}}></div>
                  </div>
                )}
              </h3>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-[#2A2A2A] mb-3"></div>
      
      {/* Brand Selector above navigation */}
      {showExpanded && (
        <div className="px-6 mb-4 transition-opacity duration-200">
          <BrandSelector 
            onSelect={handleBrandSelect}
            selectedBrandId={selectedBrandId}
            className="w-full"
          />
        </div>
      )}
      
      <div className={cn("flex-1 transition-all duration-200", showExpanded ? "px-6" : "px-2")}>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isComingSoon = item.comingSoon;
            
            const linkElement = (
              <Link
                key={item.name}
                href={isComingSoon ? "#" : item.href}
                className={cn(
                  "relative flex items-center py-2 rounded-lg transition-all duration-200 group",
                  isActive
                  ? "bg-[#2A2A2A] text-white" 
                  : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]",
                  isComingSoon && "cursor-not-allowed opacity-60",
                  showExpanded ? "px-3" : "px-2 justify-center"
                )}
                onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
              >
                  {/* Add the white indicator lip for active items */}
                  {isActive && (
                    <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
                  )}
                  <div className={cn("flex items-center w-full", showExpanded ? "space-x-3" : "justify-center")}>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {showExpanded && (
                      <div className="flex-1 min-w-0 transition-opacity duration-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {isComingSoon && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      </div>
                    )}
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
                      <p className="font-medium">{item.name}</p>
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
          <UserButton 
            appearance={{
              elements: {
                userButtonBox: "hover:bg-[#2A2A2A] rounded-full",
                userButtonTrigger: "rounded-full"
              }
            }}
          />
          {showExpanded && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 ml-2 justify-start text-gray-400 hover:text-white hover:bg-[#2A2A2A] transition-opacity duration-200"
              onClick={() => signOut(() => router.push("/dashboard"))}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </aside>
    </TooltipProvider>
  )
}


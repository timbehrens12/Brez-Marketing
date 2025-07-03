"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut, FileText, Sparkles, BrainCircuit, Send, Palette, Zap, Globe, Settings2, ClipboardList, FileBarChart } from "lucide-react"
import { UserButton, useAuth, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import BrandSelector from "@/components/BrandSelector"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAgency } from "@/contexts/AgencyContext"

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
  
  // If auth is not loaded yet or user is not authenticated, render a simplified sidebar
  if (!isLoaded || !userId) {
    return (
      <aside className={`${className} bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden`}>
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
          </div>
        </div>
        <div className="border-t border-[#2A2A2A] mb-6"></div>
        <div className="px-6 flex-1">
          <nav className="space-y-0.5 opacity-50">
            <div
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg",
                "bg-[#2A2A2A] text-white"
              )}
            >
              <LayoutDashboard className="mr-3 h-4 w-4" />
              Dashboard
            </div>
          </nav>
        </div>
        <div className="p-4 mt-auto border-t border-[#2A2A2A]">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
            disabled
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign In
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
    <aside className={`${className} bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-y-auto`}>
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
        </div>
      </div>
      <div className="border-t border-[#2A2A2A] mb-3"></div>
      
      {/* Brand Selector above navigation */}
      <div className="px-6 mb-4">
        <BrandSelector 
          onSelect={handleBrandSelect}
          selectedBrandId={selectedBrandId}
          className="w-full"
        />
      </div>
      
      <div className="px-6 flex-1">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isComingSoon = item.comingSoon;
            return (
            <Link
              key={item.name}
              href={isComingSoon ? "#" : item.href}
              className={cn(
                  "relative flex items-center px-3 py-2 rounded-lg transition-colors group",
                  isActive
                  ? "bg-[#2A2A2A] text-white" 
                  : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]",
                  isComingSoon && "cursor-not-allowed opacity-60"
              )}
              onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
            >
                {/* Add the white indicator lip for active items */}
                {isActive && (
                  <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
                )}
                <div className="flex items-center space-x-3 w-full">
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
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
                </div>
            </Link>
            )
          })}
        </nav>
      </div>
      
      <div className="p-4 mt-auto border-t border-[#2A2A2A]">
        <div className="flex items-center">
          <UserButton 
            appearance={{
              elements: {
                userButtonBox: "hover:bg-[#2A2A2A] rounded-full",
                userButtonTrigger: "rounded-full"
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 ml-2 justify-start text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
            onClick={() => signOut(() => router.push("/dashboard"))}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  )
}


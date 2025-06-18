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

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Brand Report", href: "/brand-report", icon: FileBarChart },
  { name: "Marketing Assistant", href: "/marketing-assistant", icon: BrainCircuit },
  { name: "Lead Generator", href: "/lead-generator", icon: Zap },
  { name: "Outreach Tool", href: "/outreach-tool", icon: Send },
  { name: "Ad Creative Studio", href: "/ad-creative-studio", icon: Palette },
  { name: "Site Optimizer", href: "/site-optimizer", icon: Globe },
  { name: "Settings", href: "/settings", icon: Settings },
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
  
  // If auth is not loaded yet or user is not authenticated, render a simplified sidebar
  if (!isLoaded || !userId) {
    return (
      <aside className={`${className} bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden`}>
        <div className="p-6 text-center">
          <img 
            src="https://i.imgur.com/PZCtbwG.png" 
            alt="Brez Logo" 
            className="h-12 w-auto object-contain mx-auto" 
          />
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
      <div className="p-6 text-center">
        <img 
          src="https://i.imgur.com/PZCtbwG.png" 
          alt="Brez Logo" 
          className="h-12 w-auto object-contain mx-auto" 
        />
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
            return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                  "relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                  ? "bg-[#2A2A2A] text-white" 
                  : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
              )}
            >
                {/* Add the white indicator lip for active items */}
                {isActive && (
                  <div className="absolute left-0 inset-y-2 w-0.5 bg-white rounded-full"></div>
                )}
                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
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


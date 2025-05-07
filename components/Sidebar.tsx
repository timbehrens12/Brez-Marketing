"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutGrid, // Keep for Dashboard
  BrainCircuit, // For Marketing Assistant
  AtSign, // For Outreach Tool
  Palette, // For Ad Creative Studio
  Zap, // For Lead Generator
  Globe, // For Site Optimizer
  Settings, // Keep for Settings
  LogOut 
} from "lucide-react"
import { UserButton, useAuth, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"

// Updated navigation items based on the provided image
const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { name: "Marketing Assistant", href: "/marketing-assistant", icon: BrainCircuit },
  { name: "Outreach Tool", href: "/outreach-tool", icon: AtSign },
  { name: "Ad Creative Studio", href: "/ad-creative-studio", icon: Palette },
  { name: "Lead Generator", href: "/lead-generator", icon: Zap },
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
  
  // Simplified sidebar for loading/unauthenticated state
  if (!isLoaded || !userId) {
    return (
      <aside className={cn(
        "bg-[#111] border-r border-neutral-800 flex flex-col h-full overflow-hidden w-64", 
        className
      )}>
        {/* Text Logo */}
        <div className="p-6 flex flex-col items-center justify-center text-center h-20">
          <h1 className="text-3xl font-bold text-white tracking-tighter">[bm]</h1>
          <p className="text-xs text-neutral-400 uppercase tracking-widest">dashboard</p>
        </div>
        {/* Separator */}
        <div className="border-t border-neutral-800 mx-4"></div> 
        
        <div className="px-4 pt-6 flex-1 opacity-50"> {/* Dimmed content */}
          <nav className="space-y-1">
            <div
              className={cn(
                "relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg",
                "bg-neutral-700 text-white" // Style for placeholder dashboard item
              )}
            >
              {/* Active indicator placeholder */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>
              <LayoutGrid className="ml-2 mr-3 h-5 w-5" />
              Dashboard
            </div>
            {/* Placeholder for other items */}
          </nav>
        </div>
        <div className="p-4 mt-auto border-t border-neutral-800">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-neutral-400 hover:text-white hover:bg-neutral-700"
            disabled
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign In
          </Button>
        </div>
      </aside>
    )
  }

  // Full sidebar for authenticated users
  return (
    <aside className={cn(
      "bg-[#111] border-r border-neutral-800 flex flex-col h-full overflow-y-auto w-64", 
      className
    )}>
      {/* Text Logo */}
      <div className="p-6 flex flex-col items-center justify-center text-center h-20">
        <h1 className="text-3xl font-bold text-white tracking-tighter">[bm]</h1>
        <p className="text-xs text-neutral-400 uppercase tracking-widest">dashboard</p>
      </div>
      {/* Separator */}
      <div className="border-t border-neutral-800 mx-4"></div> 
      
      <div className="px-4 pt-6 flex-1">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150",
                  isActive
                    ? "bg-neutral-800 text-white" 
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></div>
                )}
                <item.icon className={cn(
                  "ml-2 mr-3 h-5 w-5", // Adjusted margin for icon
                  isActive ? "text-white" : "text-neutral-500" // Icon color based on active state
                )} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      
      <div className="p-4 mt-auto border-t border-neutral-800">
        <div className="flex items-center">
          <UserButton 
            appearance={{
              elements: {
                userButtonBox: "hover:bg-neutral-700 rounded-full p-1",
                userButtonTrigger: "rounded-full focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-800 focus:ring-white",
                avatarBox: "h-8 w-8"
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 ml-2 justify-start text-neutral-400 hover:text-white hover:bg-neutral-700"
            onClick={() => signOut(() => router.push("/"))} // Redirect to home on sign out
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  )
}


"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut, FileText, Sparkles, Loader2 } from "lucide-react"
import { UserButton, useAuth, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "./ui/button"
import { useState, useEffect } from "react"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Intelligence", href: "/ai-dashboard", icon: Sparkles },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Customers", href: "/customers", icon: Users },
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
  const [isAppLoading, setIsAppLoading] = useState(true)
  
  // Set up a timer to detect if the app is taking too long to load
  useEffect(() => {
    // Start with loading state
    setIsAppLoading(true)
    
    // After 1 second, check if auth is loaded
    const timer = setTimeout(() => {
      if (isLoaded) {
        setIsAppLoading(false)
      }
    }, 1000)
    
    // After 5 seconds, assume app is loaded regardless
    const fallbackTimer = setTimeout(() => {
      setIsAppLoading(false)
    }, 5000)
    
    return () => {
      clearTimeout(timer)
      clearTimeout(fallbackTimer)
    }
  }, [isLoaded])
  
  // If auth is not loaded yet or user is not authenticated, render a simplified sidebar
  if (!isLoaded || !userId) {
    return (
      <aside className={`${className} bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-hidden`}>
        <div className="p-6 text-center relative">
          <img 
            src="https://i.imgur.com/hK44KGT.png" 
            alt="Brez Logo" 
            className="h-12 w-auto object-contain mx-auto" 
          />
          {isAppLoading && (
            <div className="absolute top-6 right-6">
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            </div>
          )}
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

  return (
    <aside className={`${className} bg-[#1A1A1A] border-r border-[#2A2A2A] flex flex-col h-full overflow-y-auto`}>
      <div className="p-6 text-center relative">
        <img 
          src="https://i.imgur.com/hK44KGT.png" 
          alt="Brez Logo" 
          className="h-12 w-auto object-contain mx-auto" 
        />
        {isAppLoading && (
          <div className="absolute top-6 right-6">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </div>
        )}
      </div>
      <div className="border-t border-[#2A2A2A] mb-6"></div>
      <div className="px-6 flex-1">
        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                pathname === item.href 
                  ? "bg-[#2A2A2A] text-white" 
                  : "text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          ))}
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


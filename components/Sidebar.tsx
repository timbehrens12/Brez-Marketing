"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut, FileText } from "lucide-react"
import { SignOutButton, UserButton, useAuth } from "@clerk/nextjs"
import { Button } from "./ui/button"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
  const router = useRouter()
  
  // If auth is not loaded yet or user is not authenticated, render a simplified sidebar
  if (!isLoaded || !userId) {
    return (
      <aside className={`${className} bg-[#1A1A1A] border-r border-[#2A2A2A]`}>
        <div className="p-6 flex-1">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-white">Brez</h1>
          </div>
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
      </aside>
    )
  }

  const handleSignOut = () => {
    // This function will be called after sign out is complete
    // We'll redirect to the dashboard page where the sign-in overlay will be shown
    router.push('/dashboard');
  };

  return (
    <aside className={`${className} bg-[#1A1A1A] border-r border-[#2A2A2A]`}>
      <div className="p-6 flex-1">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Brez</h1>
          <UserButton 
            appearance={{
              elements: {
                userButtonBox: "hover:bg-[#2A2A2A] rounded-full",
                userButtonTrigger: "rounded-full"
              }
            }}
          />
        </div>
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
      
      <div className="p-4 border-t border-[#2A2A2A]">
        <SignOutButton signOutCallback={handleSignOut}>
          <Button 
            variant="ghost" 
            className="w-full flex items-center gap-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </SignOutButton>
      </div>
    </aside>
  )
}


"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut } from "lucide-react"
import { SignOutButton } from "@clerk/nextjs"
import { Button } from "./ui/button"
import { Logo } from "./ui/Logo"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#222222] bg-[#111111]">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <Logo />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive 
                    ? "bg-[#222222] text-white" 
                    : "text-gray-400 hover:bg-[#1A1A1A] hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="border-t border-[#222222] p-4">
          <SignOutButton>
            <Button 
              variant="ghost" 
              className="w-full flex items-center gap-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </SignOutButton>
        </div>
      </div>
    </aside>
  )
}


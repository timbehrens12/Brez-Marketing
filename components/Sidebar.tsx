"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart2, Users, Settings, LogOut, FileText } from "lucide-react"
import { SignOutButton } from "@clerk/nextjs"
import { Button } from "./ui/button"

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
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

  return (
    <div className={`flex flex-col h-full justify-between ${className || ''}`}>
      <div>
        <aside className="w-64 min-h-screen p-4 bg-gradient-to-b from-red-400 to-red-700">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Brez Dashboard</h1>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-150 ease-in-out",
                  pathname === item.href ? "bg-red-700 text-white" : "text-white hover:bg-red-500 hover:text-white",
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
            <Link
              href="/review"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 transition-all hover:text-white"
            >
              <FileText className="h-4 w-4" />
              <span>Review (Meta Devs)</span>
            </Link>
          </nav>
        </aside>
      </div>
      
      <div className="p-4">
        <SignOutButton>
          <Button variant="ghost" className="w-full flex items-center gap-2 text-white">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </SignOutButton>
      </div>
    </div>
  )
}


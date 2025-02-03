"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ShoppingCart, BarChart3, Settings, Users, Activity, Palette, Store, Menu } from "lucide-react"

const menuItems = [
  { id: 1, label: "Summary", icon: LayoutDashboard, link: "/" },
  { id: 2, label: "Orders", icon: ShoppingCart, link: "/orders" },
  { id: 3, label: "Activity Feed", icon: Activity, link: "/activity" },
  { id: 4, label: "Creative Dashboard", icon: Palette, link: "/creative" },
  { id: 5, label: "Analytics", icon: BarChart3, link: "/analytics" },
  { id: 6, label: "Customer Insights", icon: Users, link: "/customers" },
  { id: 7, label: "Store", icon: Store, link: "/store" },
  { id: 8, label: "Settings", icon: Settings, link: "/settings" },
]

export function Sidebar() {
  const [toggleCollapse, setToggleCollapse] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "relative min-h-screen bg-[#0d1117] text-white transition-all duration-300",
        toggleCollapse ? "w-20" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Campaign Manager</span>
        </div>
        <button onClick={() => setToggleCollapse(!toggleCollapse)} className="rounded-lg p-1.5 hover:bg-gray-800">
          <Menu size={20} />
        </button>
      </div>

      <nav className="mt-6 px-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.link
          return (
            <Link
              key={item.id}
              href={item.link}
              className={cn(
                "mb-2 flex items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:bg-gray-800",
                isActive ? "bg-gray-800" : "text-gray-400",
              )}
            >
              <item.icon size={20} className="mr-3" />
              <span className={cn("transition-all", toggleCollapse ? "hidden" : "block")}>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}


"use client"

import { AuthGuard } from "@/components/AuthGuard"
import Sidebar from "@/components/Sidebar"
import { SidebarProvider } from "@/context/SidebarContext"
import { BrandProvider } from "@/lib/context/BrandContext"
import { AgencyProvider } from "@/contexts/AgencyContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <AgencyProvider>
        <BrandProvider>
          <SidebarProvider>
            <div className="flex h-screen bg-[#0a0a0a]">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </BrandProvider>
      </AgencyProvider>
    </AuthGuard>
  )
}

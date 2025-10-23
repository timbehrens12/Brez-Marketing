"use client"

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { SidebarProvider } from '@/context/SidebarContext'

// Routes that should NOT show the sidebar
const NO_SIDEBAR_ROUTES = [
  '/onboarding',
  '/privacy',
  '/terms',
  '/sign-in',
  '/sign-up',
]

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Check if current route should have no sidebar
  const shouldShowSidebar = !NO_SIDEBAR_ROUTES.some(route => 
    pathname === route || pathname?.startsWith(route)
  )
  
  // If no sidebar needed, just render children
  if (!shouldShowSidebar) {
    return <>{children}</>
  }
  
  // Render with sidebar for all authenticated pages
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#0a0a0a]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}


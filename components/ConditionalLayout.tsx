"use client"

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface ConditionalLayoutProps {
  children: ReactNode
  className?: string
}

export function ConditionalLayout({ children, className = "" }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Remove scrolling on lead-generator page
  if (pathname === '/lead-generator') {
    return (
      <main className={`flex-1 h-screen flex flex-col overflow-hidden ${className}`}>
        {children}
      </main>
    )
  }
  
  // Default scrollable layout for other pages
  return (
    <main className={`flex-1 overflow-y-auto h-screen flex flex-col ${className}`}>
      {children}
    </main>
  )
} 
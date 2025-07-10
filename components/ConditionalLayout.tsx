"use client"

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface ConditionalLayoutProps {
  children: ReactNode
  className?: string
}

export function ConditionalLayout({ children, className = "" }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Unified scrollable layout for all pages
  return (
    <main className={`flex-1 overflow-y-auto h-screen flex flex-col ${className}`}>
      {children}
    </main>
  )
} 
"use client"

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface ConditionalLayoutProps {
  children: ReactNode
  className?: string
}

export function ConditionalLayout({ children, className = "" }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // All pages now use natural scrolling layout
  return (
    <main className={`flex-1 ${className}`}>
      {children}
    </main>
  )
} 
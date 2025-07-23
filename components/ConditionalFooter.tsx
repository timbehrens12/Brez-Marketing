"use client"

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

export function ConditionalFooter() {
  const pathname = usePathname()
  
  // Hide footer on brand-report pages
  if (pathname === '/brand-report') {
    return null
  }
  
  return <Footer />
} 
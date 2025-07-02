"use client"

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

export function ConditionalFooter() {
  const pathname = usePathname()
  
  // Hide footer on lead-generator and brand-report pages
  if (pathname === '/lead-generator' || pathname === '/brand-report') {
    return null
  }
  
  return <Footer />
} 
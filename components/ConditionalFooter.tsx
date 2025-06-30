"use client"

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

export function ConditionalFooter() {
  const pathname = usePathname()
  
  // Hide footer on lead-generator page
  if (pathname === '/lead-generator') {
    return null
  }
  
  return <Footer />
} 
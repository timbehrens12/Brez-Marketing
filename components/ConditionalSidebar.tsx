"use client"

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function ConditionalSidebar() {
  const pathname = usePathname();
  const noSidebarPages = ['/', '/pricing', '/privacy', '/terms', '/data-security'];
  
  if (noSidebarPages.includes(pathname)) {
    return null;
  }
  
  return <Sidebar className="flex-shrink-0 sticky top-0 h-screen" />;
}

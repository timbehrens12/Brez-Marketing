"use client"

import { usePathname } from 'next/navigation'
import { AuthenticatedProviders } from './AuthenticatedProviders'

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/onboarding',
  '/privacy',
  '/terms',
  '/sign-in',
  '/sign-up',
]

export function ConditionalAuthProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname?.startsWith('/sign-'))
  
  // For public routes, render children directly without auth providers
  if (isPublicRoute) {
    return <>{children}</>
  }
  
  // For protected routes, wrap with authentication providers
  return <AuthenticatedProviders>{children}</AuthenticatedProviders>
}


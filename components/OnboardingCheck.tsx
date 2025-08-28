"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoaded || !user) return

    // Skip onboarding check for certain pages
    const skipOnboardingPaths = [
      '/onboarding',
      '/sign-in',
      '/login',
      '/sign-up',
      '/privacy',
      '/terms',
      '/api'
    ]

    // Don't redirect if user is on a skip path or API route
    if (skipOnboardingPaths.some(path => pathname.startsWith(path))) {
      return
    }

    // Check if user should see onboarding (only immediately after signup)
    const shouldShowOnboarding = user.unsafeMetadata?.showOnboarding === true
    
    // If user should see onboarding, redirect to onboarding page
    if (shouldShowOnboarding) {
      router.push('/onboarding')
      return
    }
  }, [user, isLoaded, router, pathname])

  // Don't render children until we've checked onboarding status
  if (!isLoaded) {
    return null // Let the main app handle loading states
  }

  return <>{children}</>
}

"use client"

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'

export function SignupCompletionHandler() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Only run once and only if we haven't checked yet
    if (!isLoaded || !user || hasChecked) return

    // Only check on dashboard page (where new users land after signup)
    if (pathname !== '/dashboard') return

    // Check if this is a new user (just signed up)
    const userCreatedAt = new Date(user.createdAt)
    const now = new Date()
    const timeSinceCreation = now.getTime() - userCreatedAt.getTime()
    const twoMinutesInMs = 2 * 60 * 1000 // 2 minutes (shorter window)

    // If user was created within the last 2 minutes and doesn't have onboarding flags set
    const isNewUser = timeSinceCreation < twoMinutesInMs
    const hasOnboardingFlags = user.unsafeMetadata?.showOnboarding !== undefined || user.unsafeMetadata?.onboardingCompleted !== undefined

    setHasChecked(true) // Mark as checked to prevent re-running

    if (isNewUser && !hasOnboardingFlags) {
      // Set the showOnboarding flag for new users
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          showOnboarding: true
        }
      }).then(() => {
        // Small delay to ensure metadata is updated
        setTimeout(() => {
          router.push('/onboarding')
        }, 100)
      }).catch(error => {
        console.error('[SignupCompletion] Error setting showOnboarding flag:', error)
      })
    }
  }, [user, isLoaded, router, pathname, hasChecked])

  return null // This component doesn't render anything
}

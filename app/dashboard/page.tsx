"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { UnifiedLoading } from '@/components/ui/unified-loading'

export default function DashboardPage() {
  const router = useRouter()
  const { userId, isLoaded } = useAuth()

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in')
      return
    }

    if (isLoaded && userId) {
      // Redirect to a specific dashboard or brand selection
      router.push('/analytics')
    }
  }, [isLoaded, userId, router])

  // Show loading while determining where to redirect
  return <UnifiedLoading variant="page" page="dashboard" />
}

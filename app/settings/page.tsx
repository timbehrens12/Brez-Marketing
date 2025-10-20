"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to landing page since authentication is removed
    router.push('/')
  }, [router])

      return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff2a2a] mx-auto mb-4"></div>
        <p>Redirecting...</p>
        </div>
      </div>
  )
}

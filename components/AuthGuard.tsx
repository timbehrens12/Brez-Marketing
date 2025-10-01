"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if Clerk has loaded and user is definitely not signed in
    if (isLoaded && !isSignedIn) {
      console.log("🔒 AuthGuard: User not authenticated, redirecting to sign-in")
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Show empty black screen while Clerk is initializing - prevents footer flash
  if (!isLoaded) {
    return <div className="min-h-screen bg-[#0B0B0B]" />
  }

  // Show empty black screen or redirect if not signed in - prevents footer flash
  if (!isSignedIn) {
    return fallback || <div className="min-h-screen bg-[#0B0B0B]" />
  }

  // User is authenticated, show the protected content
  return <>{children}</>
}

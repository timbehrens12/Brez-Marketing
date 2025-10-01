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

  // Show nothing while Clerk is initializing - let page's own loading screen handle it
  if (!isLoaded) {
    return null
  }

  // Show nothing or redirect if not signed in - let page handle it
  if (!isSignedIn) {
    return fallback || null
  }

  // User is authenticated, show the protected content
  return <>{children}</>
}

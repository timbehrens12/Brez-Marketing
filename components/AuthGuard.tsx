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

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // Show fallback or redirect if not signed in
  if (!isSignedIn) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-white">Redirecting to sign-in...</div>
      </div>
    )
  }

  // User is authenticated, show the protected content
  return <>{children}</>
}

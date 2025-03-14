"use client"

import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { useState } from "react"
import { toast } from "sonner"

export function CustomSignOutButton() {
  const { signOut } = useClerk()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (isSigningOut) return
    
    setIsSigningOut(true)
    try {
      await signOut(() => {
        // Redirect to the dashboard page which will show our custom sign-in overlay
        router.push("/dashboard")
      })
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Failed to sign out. Please try again.")
      setIsSigningOut(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? (
        <>
          <Loader2 className="mr-3 h-4 w-4 animate-spin" />
          Signing Out...
        </>
      ) : (
        <>
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </>
      )}
    </Button>
  )
} 
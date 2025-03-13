"use client"

import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "./ui/button"

export function CustomSignOutButton() {
  const { signOut } = useClerk()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut(() => {
      // Redirect to the dashboard page which will show our custom sign-in overlay
      router.push("/dashboard")
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-gray-400 hover:text-white hover:bg-[#2A2A2A] px-3"
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" />
    </Button>
  )
} 
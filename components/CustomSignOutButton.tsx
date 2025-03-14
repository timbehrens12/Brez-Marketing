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
      className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#2A2A2A]"
      onClick={handleSignOut}
    >
      <LogOut className="mr-3 h-4 w-4" />
      Sign Out
    </Button>
  )
} 
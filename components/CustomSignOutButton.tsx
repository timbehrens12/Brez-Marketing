"use client"

import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface CustomSignOutButtonProps {
  className?: string
}

export function CustomSignOutButton({ className }: CustomSignOutButtonProps) {
  const { signOut } = useClerk()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/dashboard")
  }

  return (
    <Button 
      variant="ghost" 
      className={`w-full flex items-center gap-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] ${className || ""}`}
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </Button>
  )
} 
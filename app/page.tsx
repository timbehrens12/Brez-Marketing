"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { UnifiedLoading } from "@/components/ui/unified-loading"

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="text-center">
        <img 
          src="https://i.imgur.com/PZCtbwG.png" 
          alt="Brez Logo" 
          className="h-16 w-auto object-contain mx-auto mb-6" 
        />
        <p className="text-gray-400 mb-6">Redirecting to dashboard...</p>
        <UnifiedLoading size="lg" variant="minimal" />
      </div>
    </div>
  )
}


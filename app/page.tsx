"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to dashboard...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  )
}


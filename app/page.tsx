"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push("/dashboard")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="text-center">
        <Image 
          src="/logo.png" 
          alt="Brez Logo" 
          width={150}
          height={48}
          className="h-12 w-auto mx-auto mb-4"
          style={{ objectFit: "contain" }}
        />
        <p className="text-gray-400 mb-6">Redirecting to dashboard...</p>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  )
}


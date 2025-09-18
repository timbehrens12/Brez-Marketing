"use client"

import { SignIn } from "@clerk/nextjs"
import { GridOverlay } from "@/components/GridOverlay"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] relative">
      <GridOverlay />
      <div className="w-full max-w-md px-8 py-10 rounded-xl shadow-2xl bg-gradient-to-b from-[#1A1A1A] to-[#222] border border-[#333] relative z-10">
        <div className="mb-8 text-center">
          <img 
            src="https://i.imgur.com/PZCtbwG.png" 
            alt="Brez Logo" 
            className="h-20 w-auto object-contain mx-auto mb-6" 
          />
          <p className="text-gray-400">Sign in to access your dashboard</p>
        </div>
        
        <SignIn 
          afterSignInUrl="/dashboard"
          routing="path"
          path="/sign-in"
        />
      </div>
    </div>
  )
} 
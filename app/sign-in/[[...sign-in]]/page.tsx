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
        
        {/* DEBUG: Let's see what's happening */}
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded text-red-300 text-sm">
          <p>Debug: Clerk SignIn component should appear below this box</p>
        </div>
        
        <div className="border border-yellow-500 p-4 rounded">
          <SignIn 
            afterSignInUrl="/dashboard"
            routing="path"
            path="/sign-in"
          />
        </div>
        
        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500 rounded text-blue-300 text-sm">
          <p>Debug: Clerk SignIn component should appear above this box</p>
          <p>If you only see these debug boxes, the SignIn component isn't rendering</p>
        </div>
      </div>
    </div>
  )
} 
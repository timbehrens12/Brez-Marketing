"use client"

import { SignIn } from "@clerk/nextjs"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A1A]">
      <div className="w-full max-w-md">
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-[#2A2A2A] border-[#333]",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton: "bg-[#333] border-[#444] text-white hover:bg-[#444]",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
              footerActionLink: "text-blue-400 hover:text-blue-300"
            }
          }}
          routing="hash"
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  )
}


"use client"

import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="w-full max-w-md px-8 py-10 rounded-xl shadow-2xl bg-gradient-to-b from-[#1A1A1A] to-[#222] border border-[#333]">
        <div className="mb-8 text-center">
          <img 
            src="https://i.imgur.com/PZCtbwG.png" 
            alt="Brez Logo" 
            className="h-20 w-auto object-contain mx-auto mb-6" 
          />
          <p className="text-gray-400">Sign in to access your dashboard</p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-transparent shadow-none border-0",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-[#333] border-[#444] text-white hover:bg-[#444] transition-colors",
              formButtonPrimary: "bg-white hover:bg-gray-100 text-black font-semibold transition-colors border-0 focus:ring-2 focus:ring-gray-400 focus:ring-offset-0",
              footerActionLink: "text-gray-300 hover:text-white transition-colors",
              formFieldLabel: "text-gray-300",
              formFieldInput: "bg-[#1a1a1a] border-[#333] text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-colors",
              dividerLine: "bg-[#444]",
              dividerText: "text-gray-400",
              identityPreviewText: "text-gray-300",
              identityPreviewEditButton: "text-gray-300 hover:text-white transition-colors",
              formFieldAction: "text-gray-300 hover:text-white transition-colors",
              alert: "bg-[#333] border-[#444] text-white",
              logoBox: "hidden",
              footer: "opacity-30 hover:opacity-100 transition-opacity",
              footerAction: "opacity-30 hover:opacity-100 transition-opacity",
              footerActionText: "text-white font-medium",
              otpCodeFieldInput: "bg-[#1a1a1a] border-[#333] text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400",
              formHeaderTitle: "text-white text-xl",
              formHeaderSubtitle: "text-gray-300",
              phoneNumberInput: "bg-[#1a1a1a] border-[#333] text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400",
              alternativeMethodsBlockButton: "text-gray-300 hover:text-white transition-colors",
              formFieldActionText: "text-gray-300 hover:text-white transition-colors",
              formFieldSuccessText: "text-gray-300",
              formFieldWarningText: "text-gray-300",
              formFieldErrorText: "text-red-400",
              formButtonPrimaryText: "text-black font-medium",
              alternativeMethodsBlockButtonText: "text-gray-300 hover:text-white transition-colors",
              formFieldHintText: "text-gray-400",
              formResendCodeLink: "text-gray-300 hover:text-white transition-colors",
              otpCodeFieldErrorText: "text-red-400"
            }
          }}
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  )
} 
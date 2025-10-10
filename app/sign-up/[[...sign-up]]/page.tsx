"use client"

import { SignUp } from "@clerk/nextjs"
import { GridOverlay } from "@/components/GridOverlay"

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0B] relative">
      <GridOverlay />
      <div className="w-full max-w-md px-8 py-10 rounded-xl shadow-2xl bg-gradient-to-b from-[#1A1A1A] to-[#222] border border-[#333] relative z-10">
        <div className="mb-8 text-center">
          <img 
            src="/brez-marketing-logo-scale-2.0.png" 
            alt="Brez Logo" 
            className="h-20 w-auto object-contain mx-auto mb-6" 
          />
          <p className="text-gray-400">Create your account to get started</p>
        </div>
        <SignUp 
          afterSignUpUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "bg-transparent shadow-none border-0 w-full min-h-full",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-[#444] border-[#555] text-white hover:bg-[#555] transition-colors w-full font-medium",
              formButtonPrimary: "bg-white hover:bg-gray-100 text-black font-semibold transition-colors border-0 focus:ring-2 focus:ring-gray-400 focus:ring-offset-0 w-full",
              footerActionLink: "text-blue-400 hover:text-blue-300 transition-colors font-medium",
              formFieldLabel: "text-gray-200 font-medium mb-2",
              formFieldInput: "bg-[#3a3a3a] border-[#555] text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors w-full",
              dividerLine: "bg-[#555]",
              dividerText: "text-gray-300",
              identityPreviewText: "text-gray-200",
              identityPreviewEditButton: "text-blue-400 hover:text-blue-300 transition-colors",
              formFieldAction: "text-blue-400 hover:text-blue-300 transition-colors",
              alert: "bg-[#444] border-[#555] text-white",
              logoBox: "hidden",
              footer: "text-center py-4",
              footerAction: "text-center",
              footerActionText: "text-blue-400 hover:text-blue-300 transition-colors font-medium",
              otpCodeFieldInput: "bg-[#3a3a3a] border-[#555] text-white text-center text-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 w-12 h-12",
              formHeaderTitle: "text-white text-xl font-semibold",
              formHeaderSubtitle: "text-gray-300",
              phoneNumberInput: "bg-[#3a3a3a] border-[#555] text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 flex-1 rounded-l-none border-l-0",
              phoneNumberInputGroup: "flex gap-0 w-full",
              countryCodeSelect: "bg-[#3a3a3a] border-[#555] text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 min-w-[120px] rounded-r-none border-r-0",
              alternativeMethodsBlockButton: "text-blue-400 hover:text-blue-300 transition-colors font-medium",
              formFieldActionText: "text-blue-400 hover:text-blue-300 transition-colors",
              formFieldSuccessText: "text-green-400 font-medium",
              formFieldWarningText: "text-yellow-400 font-medium",
              formFieldErrorText: "text-red-400 font-medium",
              formButtonPrimaryText: "text-black font-semibold",
              alternativeMethodsBlockButtonText: "text-blue-400 hover:text-blue-300 transition-colors",
              formFieldHintText: "text-gray-400",
              formResendCodeLink: "text-blue-400 hover:text-blue-300 transition-colors font-medium",
              otpCodeFieldErrorText: "text-red-400 font-medium",
              formFieldInfoText: "text-gray-300",
              formFieldWarning: "bg-yellow-900/30 border-yellow-500 text-yellow-300",
              formFieldError: "bg-red-900/30 border-red-500 text-red-300",
              formFieldSuccess: "bg-green-900/30 border-green-500 text-green-300",
              formButtonSecondary: "bg-[#444] border-[#555] text-white hover:bg-[#555] transition-colors font-medium",
              formButtonSecondaryText: "text-white font-medium",
              formButtonReset: "text-blue-400 hover:text-blue-300 transition-colors font-medium",
              formButtonResetText: "text-blue-400 hover:text-blue-300 transition-colors",
              formFieldRadioGroupItem: "border-[#555] text-white bg-[#3a3a3a]",
              formFieldRadioGroupItemLabel: "text-gray-200",
              formFieldCheckboxInput: "border-[#555] text-white bg-[#3a3a3a] accent-blue-400",
              formFieldCheckboxLabel: "text-gray-200",
              formFieldSelectInput: "bg-[#3a3a3a] border-[#555] text-white",
              formFieldTextareaInput: "bg-[#3a3a3a] border-[#555] text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-400 focus:border-blue-400",
              modalContent: "bg-[#2a2a2a] border-[#444]",
              modalCloseButton: "text-gray-300 hover:text-white",
              selectButton: "bg-[#3a3a3a] border-[#555] text-white hover:bg-[#444] min-h-[40px] flex items-center justify-between px-3",
              selectSearchInput: "bg-[#3a3a3a] border-[#555] text-white placeholder:text-gray-400",
              selectOption: "text-white hover:bg-[#444] px-3 py-2",
              selectOptionText: "text-white",
              selectOptionsContainer: "bg-[#2a2a2a] border-[#444] max-h-48 overflow-y-auto",
              phoneInputBox: "flex w-full gap-0",
              formFieldInputShowPasswordButton: "text-gray-300 hover:text-white bg-transparent border-0 p-2",
              formFieldInputShowPasswordIcon: "text-gray-300 hover:text-white w-5 h-5",
              formFieldInputGroup: "relative",
              formFieldInputGroupAction: "absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-white cursor-pointer",
              captcha: "w-full",
              captchaContainer: "w-full mb-4",
              main: "w-full min-h-full",
              form: "w-full space-y-4",
              formFieldRow: "w-full",
              formField: "w-full mb-4",
              formFieldInputContainer: "relative w-full"
            }
                      }}
        />
      </div>
    </div>
  )
} 
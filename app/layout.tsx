import "@/styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import type React from "react"
import { Sidebar } from "@/components/Sidebar"
import { ConditionalFooter } from "@/components/ConditionalFooter"
import { ConditionalLayout } from "@/components/ConditionalLayout"
import { ClerkProvider } from '@clerk/nextjs'
import { AuthenticatedProviders } from '@/components/AuthenticatedProviders'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Brez Dashboard",
  description: "E-commerce analytics dashboard",
  icons: {
    icon: "/brand/favicon.ico",
    shortcut: "/brand/favicon-32x32.png",
    apple: "/brand/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        url: "/brand/favicon-16x16.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        url: "/brand/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        url: "/brand/favicon-96x96.png",
      },
    ],
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          /* FORCE input field styling to match Google button */
          * input[type="email"],
          * input[type="password"],
          * input[type="text"],
          div input,
          .cl-formFieldInput,
          .cl-card input {
            background-color: #3a3a3a !important;
            background: #3a3a3a !important;
            border-color: #555 !important;
            border: 1px solid #555 !important;
            color: white !important;
          }
          
          /* Minimize Clerk branding */
          .cl-internal-b3fm6y {
            opacity: 0.3;
            font-size: 0.7rem;
            transition: opacity 0.2s;
          }
          .cl-internal-b3fm6y:hover {
            opacity: 0.7;
          }
          
          /* Hide Clerk logo in footer */
          .cl-internal-uyu30o {
            display: none !important;
          }
          
          /* Make "Sign up" link more visible */
          .cl-footerActionText {
            color: white !important;
            font-weight: 500 !important;
            opacity: 1 !important;
          }
          
          .cl-footerActionLink {
            opacity: 1 !important;
          }
          
          /* Improve verification code section */
          .cl-formHeaderTitle {
            color: white !important;
            font-size: 1.25rem !important;
            font-weight: 600 !important;
          }
          
          .cl-formHeaderSubtitle {
            color: #d1d5db !important;
            font-size: 0.875rem !important;
          }
          
          .cl-otpCodeFieldInput {
            background-color: #333 !important;
            border-color: #444 !important;
            color: white !important;
          }
          
          /* Make "Use another method" more visible */
          .cl-alternativeMethodsBlockButton {
            color: #9ca3af !important;
            font-weight: 500 !important;
            opacity: 1 !important;
            text-decoration: underline !important;
          }
          
          .cl-alternativeMethodsBlockButton:hover {
            color: white !important;
          }
          
          /* Make "Didn't receive a code" more visible */
          .cl-resendCodeLink {
            color: #9ca3af !important;
            font-weight: 500 !important;
            opacity: 1 !important;
            text-decoration: underline !important;
          }
          
          .cl-resendCodeLink:hover {
            color: white !important;
          }
          
          /* Make "No account? Sign up" more visible */
          .cl-footerAction {
            opacity: 1 !important;
            margin-top: 1rem !important;
          }
          
          /* Make all action links more visible */
          .cl-formButtonReset, 
          .cl-formResendCodeLink,
          .cl-formFieldAction {
            color: #9ca3af !important;
            font-weight: 500 !important;
            opacity: 1 !important;
          }
          
          .cl-formButtonReset:hover, 
          .cl-formResendCodeLink:hover,
          .cl-formFieldAction:hover {
            color: white !important;
          }
          
          /* Fix continue button specifically */
          .cl-formButtonPrimary {
            background-color: white !important;
            color: black !important;
            font-weight: 600 !important;
            border: none !important;
            outline: none !important;
          }
          
          .cl-formButtonPrimary:focus {
            outline: 2px solid #9ca3af !important;
            outline-offset: 2px !important;
            box-shadow: none !important;
          }
          
          /* Remove blue from all input fields - Force override */
          .cl-formFieldInput, 
          .cl-otpCodeFieldInput,
          .cl-phoneNumberInput,
          input[type="email"],
          input[type="password"],
          input[type="text"],
          .cl-rootBox .cl-formFieldInput,
          .cl-card .cl-formFieldInput,
          [data-clerk-element="formFieldInput"] {
            background-color: #3a3a3a !important;
            background: #3a3a3a !important;
            border-color: #555 !important;
            border: 1px solid #555 !important;
            color: white !important;
          }
          
          .cl-formFieldInput:focus, 
          .cl-otpCodeFieldInput:focus,
          .cl-phoneNumberInput:focus,
          input[type="email"]:focus,
          input[type="password"]:focus,
          input[type="text"]:focus {
            border-color: #9ca3af !important;
            box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.3) !important;
            outline: none !important;
          }
        `}</style>
      </head>
      <body className={cn("h-screen overflow-hidden bg-[#0A0A0A] font-sans antialiased text-white", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
            signInUrl="/sign-in"
            signUpUrl="/sign-in"
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
            appearance={{
              baseTheme: undefined,
              elements: {
                applicationLogo: "hidden"
              }
            }}
          >
            <AuthenticatedProviders>
              <div className="flex h-screen overflow-hidden fixed inset-0">
                <Sidebar className="w-64 flex-shrink-0 h-screen sticky top-0" />
                <ConditionalLayout>
                  <div className="flex-1">
                    {children}
                  </div>
                  <ConditionalFooter />
                </ConditionalLayout>
              </div>
            </AuthenticatedProviders>
          </ClerkProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}


import "@/styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import type React from "react"
import { Sidebar } from "@/components/Sidebar"
import { WidgetProvider } from "@/context/WidgetContext"
import { AuthProvider } from '@/contexts/AuthContext'
import { BrandProvider } from '@/lib/context/BrandContext'
import { ClerkProvider } from '@clerk/nextjs'
import { MetricsProvider } from '@/lib/contexts/MetricsContext'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Brez Dashboard",
  description: "E-commerce analytics dashboard",
  icons: {
    icon: "https://i.imgur.com/hK44KGT.png",
    shortcut: "https://i.imgur.com/hK44KGT.png",
    apple: "https://i.imgur.com/hK44KGT.png",
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
            color: #60a5fa !important;
            font-weight: 500 !important;
            opacity: 1 !important;
            text-decoration: underline !important;
          }
          
          /* Make "Didn't receive a code" more visible */
          .cl-resendCodeLink {
            color: #60a5fa !important;
            font-weight: 500 !important;
            opacity: 1 !important;
            text-decoration: underline !important;
          }
          
          /* Make "No account? Sign up" more visible */
          .cl-footerAction {
            opacity: 1 !important;
            margin-top: 1rem !important;
          }
          
          /* Make all action links more visible */
          .cl-formButtonReset, 
          .cl-formButtonPrimary,
          .cl-formResendCodeLink,
          .cl-formFieldAction {
            color: #60a5fa !important;
            font-weight: 500 !important;
            opacity: 1 !important;
          }
        `}</style>
      </head>
      <body className={cn("min-h-screen bg-[#0A0A0A] font-sans antialiased text-white", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkProvider>
            <BrandProvider>
              <MetricsProvider>
                <WidgetProvider>
                  <AuthProvider>
                    <div className="flex h-screen overflow-hidden">
                      <Sidebar className="w-64 flex-shrink-0" />
                      <main className="flex-1 overflow-y-auto">
                        {children}
                      </main>
                    </div>
                  </AuthProvider>
                </WidgetProvider>
              </MetricsProvider>
            </BrandProvider>
          </ClerkProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}


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


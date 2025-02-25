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
      <body className={cn("min-h-screen bg-[#0A0A0A] font-sans antialiased text-white", inter.className)}>
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <BrandProvider>
              <WidgetProvider>
                {children}
              </WidgetProvider>
            </BrandProvider>
          </ThemeProvider>
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  )
}


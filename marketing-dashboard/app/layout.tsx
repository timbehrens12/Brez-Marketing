import "@/styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
// import { Toaster } from "@/components/ui/toaster"
import { cn } from "@/lib/utils"
import type React from "react"
import { Sidebar } from "@/components/Sidebar"
import { WidgetProvider } from "@/context/WidgetContext"

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
      <body className={cn("min-h-screen bg-slate-50 font-sans antialiased", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <WidgetProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">{children}</div>
            </div>
          </WidgetProvider>
          {/* <Toaster /> */}
        </ThemeProvider>
      </body>
    </html>
  )
}


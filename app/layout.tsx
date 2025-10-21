import "@/styles/globals.css"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
// import { Toaster } from "@/components/ui/toaster"
// import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import type React from "react"
import { ClerkProvider } from '@clerk/nextjs'
import { ConditionalAuthProviders } from '@/components/ConditionalAuthProviders'
import { SidebarProvider } from "@/context/SidebarContext"

// Extend Window interface for console override tracking
declare global {
  interface Window {
    _consoleOverrideApplied?: boolean;
    _consoleErrorOverrideApplied?: boolean;
  }
}

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TLUCA Systems - Systems That Scale",
  description: "We build systems that attract, convert, and manage leads — all in one place. High-converting websites, lead generation funnels, and automated business systems for growth.",
  other: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.dev https://*.clerk.dev https://clerk.brezmarketingdashboard.com https://js.stripe.com https://www.googletagmanager.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.openai.com https://clerk.dev https://*.clerk.dev https://clerk.brezmarketingdashboard.com wss://*.supabase.co https://graph.facebook.com https://*.facebook.com; frame-src 'self' https://js.stripe.com https://js.clerk.dev https://*.clerk.dev https://clerk.brezmarketingdashboard.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';"
  },
  manifest: "/brand/site.webmanifest",
  icons: {
    icon: "/brand/favicon.ico",
    shortcut: "/brand/favicon.ico", 
    apple: "/brand/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        url: "/brand/favicon-96x96.png",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        url: "/brand/favicon.svg",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "192x192",
        url: "/brand/web-app-manifest-192x192.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        url: "/brand/web-app-manifest-512x512.png",
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
        {/* Removed Clerk-specific styling */}
        {/* Suppress annoying console errors and warnings */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                // Suppress content-script.js errors from browser extensions
                if (e.message && (
                  e.message.includes('content-script.js') ||
                  e.message.includes('AdUnit') ||
                  e.message.includes('listener indicated an asynchronous response')
                )) {
                  e.preventDefault()
                  return false
                }
              })

              // Suppress favicon 404 errors and disconnect-platform 409 errors during initial load
              const originalFetch = window.fetch
              window.fetch = function(input, init) {
                const url = typeof input === 'string' ? input : input.url
                if (url && url.includes('favicon.ico')) {
                  return Promise.resolve(new Response(null, { status: 200 }))
                }
                
                // Call original fetch and suppress console logging for expected 409s
                const fetchPromise = originalFetch.apply(this, arguments)
                
                // If this is a disconnect-platform request, handle 409s silently
                if (url && url.includes('/api/disconnect-platform') && !url.includes('/force')) {
                  return fetchPromise.catch(error => {
                    // Re-throw the error but suppress console output
                    throw error
                  })
                }
                
                return fetchPromise
              }



              // Add global error handler for uncaught errors including React hydration
              window.addEventListener('error', function(event) {
                if (event.message && (
                  event.message.includes('Minified React error #418') ||
                  event.message.includes('Text content does not match') ||
                  event.message.includes('Hydration failed')
                )) {
                  event.preventDefault()
                  return false
                }
              })
              
              // Add global error handler for uncaught promise rejections (extension errors)
              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && typeof event.reason.message === 'string' && (
                  event.reason.message.includes('listener indicated an asynchronous response') ||
                  event.reason.message.includes('message channel closed before a response') ||
                  event.reason.message.includes('asynchronous response by returning true') ||
                  event.reason.message.includes('message channel closed') ||
                  event.reason.message.includes('content-script.js') ||
                  event.reason.message.includes('AdUnit') ||
                  event.reason.message.includes('Document already loaded')
                )) {
                  event.preventDefault() // Suppress these extension errors
                  // Suppress extension errors completely (no logging even in dev)
                }
              })

              // Removed Clerk-related console suppressions
              
              // Suppress console errors from browser extensions
              const originalConsoleError = console.error
              console.error = function(...args) {
                const message = args.join(' ')
                if (message.includes('listener indicated an asynchronous response') ||
                    message.includes('message channel closed') ||
                    message.includes('content-script.js') ||
                    message.includes('AdUnit')) {
                  return // Suppress these errors
                }
                return originalConsoleError.apply(console, args)
              }

              // Helper function to detect problematic extensions (for debugging)
              window.detectExtensions = function() {
                const extensions = []
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                  // Check for common ad-related extensions
                  const knownAdExtensions = [
                    'AdBlock', 'AdGuard', 'uBlock', 'Ghostery', 'Privacy Badger',
                    'AdUnit', 'AdBlock Plus', 'Fair AdBlocker'
                  ]
                }
                return extensions
              }
            `
          }}
        />
      </head>
      <body className={cn("min-h-screen bg-[#0B0B0B] font-sans antialiased text-white", jetbrainsMono.className)}>
        <ClerkProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <SidebarProvider>
              <ConditionalAuthProviders>
                {children}
              </ConditionalAuthProviders>
            </SidebarProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}


import "@/styles/globals.css"
import type { Metadata } from "next"
import { JetBrains_Mono, Inter, Syncopate } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import type React from "react"
import { ClerkProvider } from '@clerk/nextjs'
import { ConditionalAuthProviders } from '@/components/ConditionalAuthProviders'

// Extend Window interface for console override tracking
declare global {
  interface Window {
    _consoleOverrideApplied?: boolean;
    _consoleErrorOverrideApplied?: boolean;
  }
}

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const syncopate = Syncopate({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-display",
})

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
        {/* Script tag for error suppression remains same as before */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e.message && (
                  e.message.includes('content-script.js') ||
                  e.message.includes('AdUnit') ||
                  e.message.includes('listener indicated an asynchronous response')
                )) {
                  e.preventDefault()
                  return false
                }
              })

              const originalFetch = window.fetch
              window.fetch = function(input, init) {
                const url = typeof input === 'string' ? input : input.url
                if (url && url.includes('favicon.ico')) {
                  return Promise.resolve(new Response(null, { status: 200 }))
                }
                const fetchPromise = originalFetch.apply(this, arguments)
                if (url && url.includes('/api/disconnect-platform') && !url.includes('/force')) {
                  return fetchPromise.catch(error => {
                    throw error
                  })
                }
                return fetchPromise
              }

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
                  event.preventDefault() 
                }
              })

              const originalConsoleError = console.error
              console.error = function(...args) {
                const message = args.join(' ')
                if (message.includes('listener indicated an asynchronous response') ||
                    message.includes('message channel closed') ||
                    message.includes('content-script.js') ||
                    message.includes('AdUnit')) {
                  return 
                }
                return originalConsoleError.apply(console, args)
              }

              window.detectExtensions = function() {
                const extensions = []
                if (typeof chrome !== 'undefined' && chrome.runtime) {
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
      <body className={cn(
        "min-h-screen bg-[#0B0B0B] antialiased text-white", 
        inter.variable, 
        jetbrainsMono.variable,
        syncopate.variable,
        "font-sans" // Default font
      )}>
        <ClerkProvider
          appearance={{
            baseTheme: undefined,
            variables: {
              colorPrimary: '#ffffff',
              colorBackground: '#000000',
              colorInputBackground: '#0a0a0a',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#a0a0a0',
              colorDanger: '#ff4444',
              colorSuccess: '#4ade80',
              colorWarning: '#fbbf24',
              borderRadius: '0.5rem',
            },
            elements: {
              formButtonPrimary: 'bg-white text-black hover:bg-gray-200 transition-colors',
              card: 'bg-black border border-white/10 shadow-2xl shadow-white/10',
              headerTitle: 'text-white',
              headerSubtitle: 'text-gray-400',
              socialButtonsBlockButton: 'bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors',
              socialButtonsBlockButtonText: 'text-white',
              formFieldLabel: 'text-white',
              formFieldInput: 'bg-black border-white/20 text-white focus:border-white/40',
              footerActionLink: 'text-white hover:text-gray-300',
              identityPreviewText: 'text-white',
              identityPreviewEditButton: 'text-white hover:text-gray-300',
              formFieldInputShowPasswordButton: 'text-gray-400 hover:text-white',
              dividerLine: 'bg-white/10',
              dividerText: 'text-gray-400',
              formHeaderTitle: 'text-white',
              formHeaderSubtitle: 'text-gray-400',
              otpCodeFieldInput: 'bg-black border-white/20 text-white',
              formResendCodeLink: 'text-white hover:text-gray-300',
              alertText: 'text-white',
              formFieldErrorText: 'text-red-400',
              footerActionText: 'text-gray-400',
              logoBox: 'h-16 justify-center',
              logoImage: 'w-16 h-16',
            },
            layout: {
              logoImageUrl: 'https://i.imgur.com/oPKBPvW.png',
              logoPlacement: 'inside',
            },
          }}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <ConditionalAuthProviders>
                {children}
              </ConditionalAuthProviders>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}

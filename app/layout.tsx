import "@/styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
// import { Toaster } from "@/components/ui/toaster"
// import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import type React from "react"
import { ConditionalSidebar } from "@/components/ConditionalSidebar"
import { ConditionalFooter } from "@/components/ConditionalFooter"
import { ConditionalLayout } from "@/components/ConditionalLayout"
import { ClerkProvider } from '@clerk/nextjs'
import { AuthenticatedProviders } from '@/components/AuthenticatedProviders'
import { OnboardingCheck } from '@/components/OnboardingCheck'

// Extend Window interface for console override tracking
declare global {
  interface Window {
    _consoleOverrideApplied?: boolean;
  }
}

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Brez Dashboard",
  description: "E-commerce analytics dashboard",
  other: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.dev https://*.clerk.dev https://clerk.brezmarketingdashboard.com https://js.stripe.com https://www.googletagmanager.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://api.openai.com https://clerk.dev https://*.clerk.dev https://clerk.brezmarketingdashboard.com wss://*.supabase.co https://graph.facebook.com https://*.facebook.com; frame-src 'self' https://js.stripe.com https://js.clerk.dev https://*.clerk.dev https://clerk.brezmarketingdashboard.com; object-src 'none'; base-uri 'self'; form-action 'self';"
  },
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
          /* Let ClerkProvider handle input styling, avoid conflicts */

          /* ClerkProvider handles input styling */

          /* Fix Clerk branding visibility and style */
          .cl-internal-b3fm6y,
          .cl-branded,
          [data-localization-key*="secured"] {
            opacity: 0.6 !important;
            font-size: 0.7rem;
            transition: opacity 0.2s;
            color: #9ca3af !important;
            background-color: transparent !important;
          }
          .cl-internal-b3fm6y:hover,
          .cl-branded:hover,
          [data-localization-key*="secured"]:hover {
            opacity: 0.8 !important;
            color: #d1d5db !important;
          }
          
          /* Target any Clerk watermark/branding text specifically */
          [class*="cl-"] [class*="internal"] {
            color: #9ca3af !important;
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
          
          /* Fix UserButton dropdown visibility */
          .cl-userButtonPopoverCard {
            background-color: #1a1a1a !important;
            border-color: #333 !important;
            color: white !important;
          }
          
          .cl-userButtonPopoverMain {
            background-color: #1a1a1a !important;
          }
          
          .cl-userButtonPopoverActionButton {
            color: white !important;
            background-color: transparent !important;
          }
          
          .cl-userButtonPopoverActionButton:hover {
            background-color: #333 !important;
          }
          
          .cl-userButtonPopoverActionButtonText {
            color: white !important;
          }
          
          .cl-userButtonPopoverActionButtonIcon {
            color: #9ca3af !important;
          }
          
          .cl-userPreviewTextContainer {
            color: white !important;
          }
          
          .cl-userPreviewMainIdentifier {
            color: white !important;
          }
          
          .cl-userPreviewSecondaryIdentifier {
            color: #9ca3af !important;
          }
          
          /* Fix bright account modal - comprehensive dark theme */
          .cl-modalContent,
          .cl-card,
          .cl-cardBox,
          .cl-modalBackdrop,
          .cl-modalContentBox,
          .cl-userProfile-root,
          .cl-userProfile-modal,
          .cl-userProfile-modalContent,
          .cl-pageScrollBox,
          .cl-profilePage,
          .cl-profileSection,
          .cl-accordionPanel,
          .cl-accordion,
          .cl-scrollBox,
          .cl-rootBox,
          .cl-internal,
          .cl-userProfile,
          .cl-profilePage-root {
            background-color: #0f0f0f !important;
            background: #0f0f0f !important;
            color: white !important;
          }
          
          /* Only apply dark backgrounds to main container surfaces - not inner elements */
          .cl-profileSectionContent,
          .cl-profileSectionPrimaryButton,
          .cl-avatarBox,
          .cl-userButtonBox,
          .cl-formContainer,
          .cl-main,
          .cl-content,
          .cl-modalCloseButton {
            background-color: #0f0f0f !important;
            background: #0f0f0f !important;
          }
          
          /* Override any specific light backgrounds on containers only */
          .cl-card .cl-card,
          .cl-cardBox .cl-cardBox,
          .cl-profileSection__account,
          .cl-profileSection__profile,
          .cl-profileSection__security,
          .cl-profileSectionItem,
          .cl-profileSectionItemButton,
          .cl-profileSectionHeader {
            background-color: #0f0f0f !important;
            border-color: #333 !important;
          }
          
          /* Let ClerkProvider appearance handle button styling, only fix specific issues */
          
          /* Keep inner button elements and spans transparent to avoid black highlights */
          .cl-socialButtonsBlockButton *,
          .cl-formButtonPrimary *,
          .cl-formFieldAction *,
          .cl-formButtonReset *,
          .cl-formFieldActionButton *,
          .cl-alternativeMethodsBlockButton *,
          .cl-resendCodeLink *,
          .cl-footerActionLink * {
            background-color: transparent !important;
          }
          
          /* Specifically fix password visibility toggle and other form actions */
          .cl-formFieldAction,
          .cl-formFieldActionButton {
            background-color: transparent !important;
          }
          
          /* Specifically target any remaining light elements */
          .cl-internal-1a2a3b4c,
          .cl-internal-5d6e7f8g,
          .cl-profilePage-content,
          .cl-profileSection-content {
            background-color: #0f0f0f !important;
            background: #0f0f0f !important;
          }
          
          .cl-headerTitle,
          .cl-headerSubtitle,
          .cl-socialButtonsBlockButton,
          .cl-dividerText,
          .cl-formFieldLabel,
          .cl-profileSectionTitle,
          .cl-profileSectionTitleText,
          .cl-accordionTriggerButton,
          .cl-menuItem,
          .cl-menuButton,
          .cl-navbarButton,
          .cl-breadcrumbsItem,
          .cl-breadcrumbsItemDivider,
          .cl-pageScrollBox h1,
          .cl-pageScrollBox h2,
          .cl-pageScrollBox h3,
          .cl-pageScrollBox label,
          .cl-pageScrollBox p,
          .cl-pageScrollBox span,
          .cl-pageScrollBox div {
            color: white !important;
            background-color: transparent !important;
          }
          
          /* Input styling handled by ClerkProvider */
          
          .cl-selectOption {
            background-color: #2a2a2a !important;
            color: white !important;
          }
          
          .cl-selectOption:hover {
            background-color: #333 !important;
          }
          
          .cl-menuList {
            background-color: #1a1a1a !important;
            border-color: #333 !important;
          }
          
          .cl-menuItem:hover {
            background-color: #333 !important;
          }
          
          .cl-badge {
            background-color: #333 !important;
            color: white !important;
          }
          
          .cl-alertIcon {
            color: #9ca3af !important;
          }
          
          .cl-formButtonPrimary:focus {
            outline: 2px solid #9ca3af !important;
            outline-offset: 2px !important;
            box-shadow: none !important;
          }
          
          /* ClerkProvider variables handle input styling */
        `}</style>
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

              // Override console.log to catch network request logs (with safety check)
              if (!window._consoleOverrideApplied) {
                const originalLog = console.log
                console.log = function(...args) {
                if (args.some(arg =>
                  typeof arg === 'string' && (
                    arg.includes('409 (Conflict)') ||
                    arg.includes('disconnect-platform 409') ||
                    arg.includes('POST https://') && arg.includes('409')
                  )
                )) {
                  return // Suppress these logs
                }
                originalLog.apply(console, args)
              }

              // Override console.warn to suppress GoTrueClient warnings
              const originalWarn = console.warn
              console.warn = function(...args) {
                if (args.some(arg =>
                  typeof arg === 'string' && (
                    arg.includes('Multiple GoTrueClient instances detected') ||
                    arg.includes('Failed to parse URL from /pipeline') ||
                    arg.includes('Redis client was initialized without url or token')
                  )
                )) {
                  return // Suppress these warnings
                }
                originalWarn.apply(console, args)
              }

              // Suppress browser extension console.log messages
              const originalLog = console.log
              console.log = function(...args) {
                if (args.some(arg =>
                  typeof arg === 'string' && (
                    // Filter out browser extension logs
                    arg.includes('content-script.js') ||
                    arg.includes('AdUnit') ||
                    arg.includes('Document already loaded') ||
                    arg.includes('Attempting to initialize') ||
                    arg.includes('initialized successfully')
                  )
                )) {
                  return // Suppress these logs
                }
                originalLog.apply(console, args)
                }
                window._consoleOverrideApplied = true
              }

              // Also suppress specific error messages
              const originalError = console.error
              console.error = function(...args) {
                if (args.some(arg =>
                  typeof arg === 'string' && (
                    arg.includes('400 Bad Request') ||
                    arg.includes('409 (Conflict)') ||
                    arg.includes('disconnect-platform 409') ||
                    arg.includes('outreach_message_usage') ||
                    // Filter out extension listener timeout errors
                    arg.includes('listener indicated an asynchronous response') ||
                    arg.includes('message channel closed before a response') ||
                    arg.includes('asynchronous response by returning true') ||
                    arg.includes('message channel closed') ||
                    // Filter out specific Supabase query errors we're debugging
                    arg.includes('user_id=eq.') ||
                    arg.includes('Bad Request') ||
                    // Filter out browser extension errors
                    arg.includes('content-script.js') ||
                    arg.includes('AdUnit') ||
                    arg.includes('Document already loaded')
                  )
                )) {
                  return // Suppress these errors
                }
                originalError.apply(console, args)
              }

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

              // Helper function to detect problematic extensions (for debugging)
              window.detectExtensions = function() {
                const extensions = []
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                  // Check for common ad-related extensions
                  const knownAdExtensions = [
                    'AdBlock', 'AdGuard', 'uBlock', 'Ghostery', 'Privacy Badger',
                    'AdUnit', 'AdBlock Plus', 'Fair AdBlocker'
                  ]
                  console.log('Extension detection: Check browser extension manager for:', knownAdExtensions.join(', '))
                }
                return extensions
              }
            `
          }}
        />
      </head>
      <body className={cn("min-h-screen bg-[#0A0A0A] font-sans antialiased text-white", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
            signInUrl="/login"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            afterSignUpUrl="/dashboard"
            appearance={{
              baseTheme: undefined,
              variables: {
                colorBackground: '#0f0f0f',
                colorPrimary: '#ffffff',
                colorText: '#ffffff',
                colorInputBackground: '#2a2a2a',
                colorInputText: '#ffffff',
                colorShimmer: '#333333',
                borderRadius: '10px',
                colorTextSecondary: '#9ca3af',
                colorDanger: '#ef4444',
                colorSuccess: '#10b981',
                colorWarning: '#f59e0b',
              },
              elements: {
                applicationLogo: "hidden",
                card: 'bg-[#0f0f0f] border border-zinc-700',
                modalContent: 'bg-[#0f0f0f]',
                modalBackdrop: 'bg-black/50',
                formButtonPrimary: 'bg-white hover:bg-gray-100 text-black border border-white font-semibold',
                socialButtonsBlockButton: 'bg-zinc-800/70 hover:bg-zinc-700 border border-zinc-600 text-white',
                socialButtonsBlockButtonText: 'text-white',
                dividerText: 'bg-[#0f0f0f] text-zinc-400',
                formFieldInput: 'bg-[#2a2a2a] border border-zinc-600 text-white focus:border-zinc-400',
                formFieldLabel: 'text-white',
                headerTitle: 'text-white',
                headerSubtitle: 'text-zinc-400',
                userButtonPopoverCard: 'bg-[#0f0f0f] border border-zinc-700',
                userButtonPopoverMain: 'bg-[#0f0f0f]',
                userButtonPopoverActionButton: 'text-white hover:bg-zinc-800',
                userButtonPopoverActionButtonText: 'text-white',
                userButtonPopoverActionButtonIcon: 'text-zinc-400',
                otpCodeFieldInput: 'bg-[#2a2a2a] border border-zinc-600 text-white',
                footerActionText: 'text-white',
                footerActionLink: 'text-white hover:text-zinc-300',
                alternativeMethodsBlockButton: 'text-zinc-400 hover:text-white',
                formButtonReset: 'text-zinc-400 hover:text-white',
                formFieldAction: 'text-zinc-400 hover:text-white',
                badge: 'bg-zinc-700 text-white',
                menuList: 'bg-[#1a1a1a] border border-zinc-700',
                menuItem: 'text-white hover:bg-zinc-800',
                selectButton: 'bg-[#2a2a2a] border border-zinc-600 text-white',
                selectOption: 'bg-[#2a2a2a] text-white hover:bg-zinc-700',
              },
            }}
          >
            <AuthenticatedProviders>
              <OnboardingCheck>
                <div className="flex min-h-screen">
                  <ConditionalSidebar />
                  <div className="flex-1 flex flex-col">
                    <ConditionalLayout>
                      <div className="flex-1">
                        {children}
                      </div>
                    </ConditionalLayout>
                    <ConditionalFooter />
                  </div>
                </div>
              </OnboardingCheck>
            </AuthenticatedProviders>
          </ClerkProvider>
          {/* <Toaster /> */}
          {/* <SonnerToaster /> */}
        </ThemeProvider>
      </body>
    </html>
  )
}


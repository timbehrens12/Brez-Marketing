import "@/styles/globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
// import { Toaster } from "@/components/ui/toaster"
// import { Toaster as SonnerToaster } from "@/components/ui/sonner"
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
          
          /* Ensure filled inputs keep the same color */
          * input[type="email"]:not(:placeholder-shown),
          * input[type="password"]:not(:placeholder-shown),
          * input[type="text"]:not(:placeholder-shown),
          div input:not(:placeholder-shown),
          .cl-formFieldInput:not(:placeholder-shown),
          .cl-card input:not(:placeholder-shown),
          /* Handle active and focused states with text */
          * input[type="email"]:focus:not(:placeholder-shown),
          * input[type="password"]:focus:not(:placeholder-shown),
          * input[type="text"]:focus:not(:placeholder-shown),
          * input[type="email"]:active,
          * input[type="password"]:active,
          * input[type="text"]:active {
            background-color: #3a3a3a !important;
            background: #3a3a3a !important;
            border-color: #555 !important;
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
          
          /* Force all nested elements to dark background */
          .cl-profileSectionContent,
          .cl-profileSectionPrimaryButton,
          .cl-avatarBox,
          .cl-userButtonBox,
          .cl-formContainer,
          .cl-main,
          .cl-content,
          .cl-modalCloseButton,
          .cl-profileSection div,
          .cl-profilePage div,
          .cl-userProfile div,
          .cl-card div,
          .cl-cardBox div {
            background-color: #0f0f0f !important;
            background: #0f0f0f !important;
          }
          
          /* Override any specific light backgrounds */
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
          
          /* Ensure no light backgrounds on any nested content */
          [class*="cl-"] {
            background-color: #0f0f0f !important;
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
          
          .cl-formFieldInput,
          .cl-selectButton,
          .cl-selectSearchInput {
            background-color: #2a2a2a !important;
            border-color: #444 !important;
            color: white !important;
          }
          
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
            background-color: #3a3a3a !important;
            background: #3a3a3a !important;
            border-color: #9ca3af !important;
            box-shadow: 0 0 0 2px rgba(156, 163, 175, 0.3) !important;
            outline: none !important;
          }
        `}</style>
      </head>
      <body className={cn("min-h-screen bg-[#0A0A0A] font-sans antialiased text-white", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              baseTheme: undefined,
              elements: {
                applicationLogo: "hidden"
              }
            }}
          >
            <AuthenticatedProviders>
              <div className="flex min-h-screen">
                <Sidebar className="flex-shrink-0 sticky top-0 h-screen" />
                <div className="flex-1 flex flex-col">
                  <ConditionalLayout>
                    <div className="flex-1">
                      {children}
                    </div>
                  </ConditionalLayout>
                  <ConditionalFooter />
                </div>
              </div>
            </AuthenticatedProviders>
          </ClerkProvider>
          {/* <Toaster /> */}
          {/* <SonnerToaster /> */}
        </ThemeProvider>
      </body>
    </html>
  )
}


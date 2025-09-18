import { authMiddleware } from "@clerk/nextjs"
import { NextRequest, NextResponse } from "next/server"

export default authMiddleware({
  debug: true, // Enable debug logging
  publicRoutes: [
    "/",
    "/review",
    "/api/webhooks(.*)",
    "/privacy",
    "/terms",
    "/data-security",
    // REMOVED "/dashboard" - this should require authentication!
    "/sign-in(.*)",
    "/login(.*)",
    "/sign-up(.*)",
    "/join(.*)",
    "/api/join(.*)",
    "/help/(.*)",
    "/api/shopify/sync",
    "/api/shopify/callback",
    "/api/shopify/auth",
    "/api/auth/meta(.*)",
    "/settings/meta-callback",
    "/api/cron/meta-sync",
    "/api/cron/process-queue",
    "/api/worker/shopify",
    "/api/cron(.*)",
    "/api/worker(.*)",
    "/api/public-worker",
    "/api/test-simple",
    "/api/reports/refresh"
  ],
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/api/worker(.*)",
    "/api/cron(.*)",
    "/api/public-worker",
    "/api/test-simple",
    "/_next(.*)"
  ],
  beforeAuth: (req: NextRequest) => {
    const url = new URL(req.url)
    
    // EXPLICITLY ALLOW WORKER AND CRON ROUTES
    if (url.pathname.includes('/api/worker') || 
        url.pathname.includes('/api/cron') ||
        url.pathname.includes('/api/public-worker') ||
        url.pathname.includes('/api/test-simple')) {
      console.log(`[Middleware] BYPASSING AUTH for ${url.pathname}`)
      return NextResponse.next()
    }
    
    // 🔒 SECURITY: Block debug/admin endpoints in production
    if (process.env.NODE_ENV === 'production') {
      if (url.pathname.startsWith('/api/debug/') || 
          url.pathname.startsWith('/api/sql/') ||
          url.pathname === '/api/clear-data') {
        console.warn(`🚨 SECURITY: Blocked ${url.pathname} in production`)
        return NextResponse.json(
          { error: 'Endpoint not available in production' }, 
          { status: 403 }
        )
      }
    }
  },
  afterAuth: (auth, req) => {
    // 🔒 SECURITY: Block access to protected dashboard routes when not authenticated
    const protectedRoutes = [
      '/dashboard', '/settings', '/analytics', '/customers', '/orders', '/onboarding',
      '/action-center', '/ad-creative-studio', '/ai-dashboard', '/ai-marketing-consultant',
      '/brand-report', '/critical-brands', '/debug-shopify-sync', 
      '/debug-supabase', '/lead-generator', '/marketing-assistant', '/meta-test',
      '/outreach-tool', '/setup-jwt', '/share-brands', '/shopify'
    ]
    const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))
    
    if (isProtectedRoute && !auth.userId) {
      console.warn(`🚨 SECURITY: Unauthorized access attempt to ${req.nextUrl.pathname} - redirecting to sign-in`)
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }

    // 🔒 SECURITY: Enhanced logging for security monitoring
    if (req.nextUrl.pathname.startsWith('/api/')) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.nextUrl.pathname,
        userId: auth.userId || 'anonymous',
        ip: req.ip || req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown'
      }
      console.log(`🔒 API Access: ${JSON.stringify(logEntry)}`)
      
      // Log sensitive data access specifically
      if (req.nextUrl.pathname.includes('/api/shopify/') || 
          req.nextUrl.pathname.includes('/api/meta/') ||
          req.nextUrl.pathname.includes('/customer') ||
          req.nextUrl.pathname.includes('/data')) {
        console.log(`🔒 CUSTOMER DATA ACCESS: ${JSON.stringify(logEntry)}`)
      }
    }
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}


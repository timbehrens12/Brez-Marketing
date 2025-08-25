import { authMiddleware } from "@clerk/nextjs"
import { NextRequest, NextResponse } from "next/server"

export default authMiddleware({
  publicRoutes: [
    "/",
    "/review",
    "/api/webhooks(.*)",
    "/privacy",
    "/terms",
    "/dashboard",
    "/sign-in(.*)",
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
    "/api/reports/refresh"
  ],
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/_next(.*)"
  ],
  beforeAuth: (req: NextRequest) => {
    // 🔒 SECURITY: Block debug/admin endpoints in production
    if (process.env.NODE_ENV === 'production') {
      const url = new URL(req.url)
      
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


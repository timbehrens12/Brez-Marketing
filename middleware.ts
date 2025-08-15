import { authMiddleware } from "@clerk/nextjs"

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
  ]
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}


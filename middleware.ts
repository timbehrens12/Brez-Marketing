import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  publicRoutes: [
    "/",
    "/review",
    "/api/webhooks(.*)",
    "/privacy",
    "/api/shopify/sync",
    "/api/shopify/callback",
    "/api/shopify/auth",
    "/api/auth/meta(.*)",
    "/settings/meta-callback",
    "/api/meta/test",
    "/api/meta/public-test",
    "/meta-test",
    "/api/meta/direct-test",
    "/api/meta/sync",
    "/api/meta/diagnose",
    "/api/metrics/meta",
    "/api/cron/meta-sync",
    "/api/debug/meta-metrics",
    "/api/analytics/meta/campaigns"
  ],
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/_next(.*)"
  ]
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
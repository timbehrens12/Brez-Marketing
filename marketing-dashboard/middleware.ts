import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  publicRoutes: [
    "/",
    "/review",
    "/api/webhooks(.*)",
    "/api/auth/(.*)",
    "/privacy",
    "/api/shopify/sync",
    "/api/shopify/callback",
    "/api/shopify/auth"
  ],
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/_next(.*)",
  ]
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  publicRoutes: [
    "/",
    "/review",
    "/api/webhooks(.*)",
    "/api/auth/(.*)",
    "/privacy",
  ],
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/_next(.*)",
  ]
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
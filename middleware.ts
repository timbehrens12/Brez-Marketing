import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  // Only protect routes that start with /dashboard
  publicRoutes: [
    "/((?!dashboard).*)",  // All routes that don't start with dashboard
    "/api/webhooks(.*)",
    "/api/auth/(.*)",
  ],
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
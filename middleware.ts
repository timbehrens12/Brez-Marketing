import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  publicRoutes: [
    "/",
    "/review",
    "/sign-in",
    "/sign-up",
    "/api/webhooks(.*)",
    "/api/auth/(.*)",
    "/privacy",
  ],
  ignoredRoutes: [
    "/api/webhooks(.*)",
    "/_next(.*)",
  ],
  afterAuth(auth, req) {
    // If trying to access protected routes while not logged in
    if (!auth.userId && (
      req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname.startsWith('/settings')
    )) {
      const signInUrl = new URL('/', req.url) // Changed from /sign-in to /
      signInUrl.searchParams.set('redirect_url', req.url)
      return Response.redirect(signInUrl)
    }
  }
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
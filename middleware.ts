import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  publicRoutes: [
    "/",
    "/review",
    "/review/callback",
    "/meta/auth",
    "/meta/callback",
    "/api/auth/meta/callback"
  ],
  afterAuth(auth, req) {
    // Handle auth redirects
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url)
      signInUrl.searchParams.set('redirect_url', req.url)
      return Response.redirect(signInUrl)
    }

    // Redirect to dashboard if signed in and on home page
    if (auth.userId && req.nextUrl.pathname === "/") {
      const dashboardUrl = new URL('/dashboard', req.url)
      return Response.redirect(dashboardUrl)
    }
  }
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
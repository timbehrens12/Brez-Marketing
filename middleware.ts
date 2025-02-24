import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  publicRoutes: [
    "/review",
    "/review/callback",
    "/api/auth/meta/callback"
  ],
  afterAuth(auth, req) {
    // Redirect to dashboard if signed in and trying to access public routes
    if (auth.userId && req.nextUrl.pathname === "/") {
      const dashboardUrl = new URL('/dashboard', req.url)
      return Response.redirect(dashboardUrl)
    }
    
    // Redirect to sign in if not authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url)
      return Response.redirect(signInUrl)
    }
  }
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  console.log("Middleware running for path:", pathname)

  // If we're on the dashboard page and have a shop parameter, let it through
  if (pathname === "/dashboard" && searchParams.get("shop")) {
    console.log("Allowing dashboard access with shop param")
    return NextResponse.next()
  }

  // If we're in the auth flow, let it through
  if (pathname.startsWith("/auth") || pathname.startsWith("/api/auth")) {
    console.log("Allowing auth flow")
    return NextResponse.next()
  }

  // If we're on the dashboard without a shop parameter, check session
  if (pathname === "/dashboard") {
    // Get the shop from the cookie if it exists
    const shopCookie = request.cookies.get("shopify_shop")
    if (!shopCookie?.value) {
      console.log("No shop in session, redirecting to root")
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Allow all other requests
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}


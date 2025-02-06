import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  console.log(
    `[Middleware] Path: ${pathname}, Shop: ${searchParams.get("shop")}, Cookies: ${request.cookies.toString()}`,
  )

  // Always allow API routes
  if (pathname.startsWith("/api/")) {
    console.log("[Middleware] Allowing API route")
    return NextResponse.next()
  }

  // Always allow static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.includes("/static/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css")
  ) {
    return NextResponse.next()
  }

  const shop = searchParams.get("shop")
  const shopCookie = request.cookies.get("shopify_shop")

  // If we're on the dashboard
  if (pathname === "/dashboard") {
    console.log("[Middleware] Dashboard access attempt", {
      shop,
      shopCookie: shopCookie?.value,
      hasShopParam: !!shop,
      hasCookie: !!shopCookie,
    })

    // If we have a shop parameter, always allow and set cookie
    if (shop) {
      console.log("[Middleware] Setting shop cookie and allowing access")
      const response = NextResponse.next()
      response.cookies.set("shopify_shop", shop, {
        httpOnly: true,
        secure: true,         // Always secure in production
        sameSite: "none",     // Allow cross-site cookies
        path: "/",
      })
      
      return response
    }

    // If we have a valid cookie but no shop parameter, allow access
    if (shopCookie?.value) {
      console.log("[Middleware] Valid cookie found, allowing access")
      return NextResponse.next()
    }

    // No shop parameter or cookie, redirect to root
    console.log("[Middleware] No shop or cookie found, redirecting to root")
    return NextResponse.redirect(new URL("/", request.url))
  }

  // If we're on the root path
  if (pathname === "/") {
    // If we have a shop parameter, redirect to dashboard
    if (shop) {
      console.log("[Middleware] Shop parameter found on root, redirecting to dashboard")
      return NextResponse.redirect(new URL(`/dashboard?shop=${shop}`, request.url))
    }
    return NextResponse.next()
  }

  // Allow all other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}


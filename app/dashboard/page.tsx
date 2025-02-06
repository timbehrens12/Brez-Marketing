"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";
import { Loader2 } from "lucide-react";

// Use the public env variable for your frontend URL.
// When testing on Vercel, NEXT_PUBLIC_FRONTEND_URL should be set to "https://brez-marketing.vercel.app"
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
// Use the API URL from environment variables.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-campaign-manager-8170707a798c.herokuapp.com";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // State to store the shop from the query parameter
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const shop = searchParams.get("shop");
    console.log("[Dashboard] Initial load", {
      shop,
      searchParams: searchParams.toString(),
    });

    if (!shop) {
      const storedShop = sessionStorage.getItem("shopify_shop");
      if (!storedShop) {
        console.log("[Dashboard] No shop found in URL or session, redirecting to root");
        router.push("/");
        return;
      }
      console.log("[Dashboard] Adding stored shop to URL");
      router.push(`/dashboard?shop=${storedShop}`);
      return;
    }

    // Save the shop in state and in sessionStorage.
    setSelectedStore(shop);
    sessionStorage.setItem("shopify_shop", shop);

    async function verifySession() {
      try {
        console.log("[Dashboard] Verifying session for shop:", shop);
        const response = await fetch(`${API_URL}/shopify/verify-session?shop=${shop}`, {
          credentials: "include", // Include cookies in the request
        });
        const data = await response.json();

        if (!data.authenticated) {
          console.log("[Dashboard] Session not authenticated, initiating auth flow");
          const redirectUri = `${FRONTEND_URL}/dashboard`;
          window.location.href = `${API_URL}/shopify/auth?shop=${shop}&redirect_uri=${encodeURIComponent(
            redirectUri
          )}`;
          return;
        }

        console.log("[Dashboard] Session verified successfully");
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        console.error("[Dashboard] Session verification failed:", error);
        setError("Failed to verify session. Please try again.");
        setIsLoading(false);
      }
    }

    verifySession();
  }, [router, searchParams]);

  // Secondary effect: If there's no shop in the URL or sessionStorage, redirect to root.
  useEffect(() => {
    const shop = searchParams.get("shop");
    if (!shop && !sessionStorage.getItem("shopify_shop")) {
      router.push("/");
    }
  }, [router, searchParams]);

  if (isLoading || !selectedStore) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Authenticating...</span>
        </div>
      </div>
    );
  }

  // Pass the selectedStore prop to DashboardContent
  return <DashboardContent selectedStore={selectedStore} />;
}

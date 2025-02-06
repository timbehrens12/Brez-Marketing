"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";
import { Loader2 } from "lucide-react";

// Use environment variables for your URLs.
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://my-campaign-manager-8170707a798c.herokuapp.com";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State for the shop parameter and session status.
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // This effect runs once when the page loads.
  useEffect(() => {
    // Try to get the shop from the URL.
    const shop = searchParams.get("shop");

    if (shop) {
      setSelectedStore(shop);
      sessionStorage.setItem("shopify_shop", shop);
      verifySession(shop);
    } else {
      // If no shop is in the URL, try to load it from sessionStorage.
      const storedShop = sessionStorage.getItem("shopify_shop");
      if (storedShop) {
        setSelectedStore(storedShop);
        verifySession(storedShop);
      } else {
        // No shop found at all; redirect to the root page.
        router.push("/");
      }
    }
    // We intentionally run this effect only once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifySession(shop: string) {
    try {
      console.log("[Dashboard] Verifying session for shop:", shop);
      const response = await fetch(`${API_URL}/shopify/verify-session?shop=${shop}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!data.authenticated) {
        console.log("[Dashboard] Session not authenticated, initiating auth flow");
        // Redirect to the auth flow using the FRONTEND_URL so that your redirect URI is correct.
        const redirectUri = `${FRONTEND_URL}/dashboard`;
        window.location.href = `${API_URL}/shopify/auth?shop=${shop}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}`;
        return;
      }

      console.log("[Dashboard] Session verified successfully");
      setIsAuthenticated(true);
    } catch (err) {
      console.error("[Dashboard] Session verification failed:", err);
      setError("Session verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-lg font-medium">Verifying session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-red-500">{error}</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This case should generally not occur because we redirect in verifySession if not authenticated.
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-lg font-medium">Authenticating...</span>
      </div>
    );
  }

  // Finally, render your dashboard content.
  return <DashboardContent selectedStore={selectedStore} />;
}

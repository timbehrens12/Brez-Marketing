"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/dashboard";
import type { DateRange } from "react-day-picker";
import type { ComparisonType } from "@/components/ComparisonPicker";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.brezmarketingdashboard.com";


export default function DashboardPage() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });
  const [comparisonType, setComparisonType] = useState<ComparisonType>("none");
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange>();
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const shop = searchParams.get("shop");
  
    if (!shop) {
      console.log("No shop found in URL. Checking local storage...");
      const savedShop = localStorage.getItem("shop");
      if (savedShop) {
        console.log("Using saved shop:", savedShop);
        setSelectedStore(savedShop);
      } else {
        console.warn("No saved shop found, redirecting to Shopify auth.");
        router.push("/shopify/auth");
      }
      return;
    }
  
    if (selectedStore !== shop) {
      console.log("Persisting shop:", shop);
      localStorage.setItem("shop", shop);
      setSelectedStore(shop);
    }
  
    console.log("Fetching session data to verify authentication...");
    fetch(`${API_URL}/api/check-session?shop=${encodeURIComponent(shop)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          console.warn("Session not found, redirecting to auth...");
          router.push(`/shopify/auth?shop=${encodeURIComponent(shop)}`);
        } else {
          console.log("✅ Session verified, staying on dashboard.");
        }
      })
      .catch((err) => {
        console.error("Session check failed:", err);
      });
  }, [searchParams, router, selectedStore]);
  
  

  useEffect(() => {
    console.log("Checking session...");
    console.log("Selected Store:", selectedStore);
  }, [selectedStore]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const onStoreSelect = (store: string) => {
    setSelectedStore(store);
  };

  const onDateRangeChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
  };

  const handleComparisonChange = (type: ComparisonType, customRange?: DateRange) => {
    setComparisonType(type);
    setComparisonDateRange(customRange);
  };

  return (
    <Layout
      onStoreSelect={onStoreSelect}
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      comparisonType={comparisonType}
      comparisonDateRange={comparisonDateRange}
      onComparisonChange={handleComparisonChange}
    >
      <Dashboard
        selectedStore={selectedStore}
        setSelectedStore={setSelectedStore}
        dateRange={dateRange}
        comparisonType={comparisonType}
        comparisonDateRange={comparisonDateRange}
      />
    </Layout>
  );
}

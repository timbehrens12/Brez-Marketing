"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/dashboard";
import type { DateRange } from "react-day-picker";
import type { ComparisonType } from "@/components/ComparisonPicker";

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
  
    if (shop && selectedStore !== shop) {
      console.log("Persisting shop:", shop);
      localStorage.setItem("shop", shop); // Save shop to localStorage
      setSelectedStore(shop);
      setIsLoading(false);
      return;
    }
  
    const savedShop = localStorage.getItem("shop");
    if (savedShop) {
      console.log("Using saved shop:", savedShop);
      setSelectedStore(savedShop);
      return;
    }
  
    console.log("No shop found, redirecting to auth...");
    router.push("/shopify/auth"); // Redirect to Shopify auth instead of root
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

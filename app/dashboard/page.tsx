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
    if (shop) {
      setSelectedStore(shop);
      checkSession(shop);
    } else {
      router.push("/");
    }
  }, [searchParams, router]);

  async function checkSession(shop: string) {
    const response = await fetch(`${API_URL}/shopify/verify-session`);
    const data = await response.json();
    
    if (!data.authenticated) {
      router.push(`${API_URL}/shopify/auth?shop=${encodeURIComponent(shop)}`);
    } else {
      setIsLoading(false);
    }
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <Layout
      onStoreSelect={setSelectedStore}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      comparisonType={comparisonType}
      comparisonDateRange={comparisonDateRange}
      onComparisonChange={setComparisonType}
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

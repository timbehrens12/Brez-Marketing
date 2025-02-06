"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

console.log("Minimal DashboardPage loaded");

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [shop, setShop] = useState<string | null>(null);

  useEffect(() => {
    const shopParam = searchParams.get("shop");
    setShop(shopParam);
    console.log("Minimal DashboardPage, shop parameter:", shopParam);
  }, [searchParams]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Minimal Dashboard Page</h1>
      {shop ? <p>Shop: {shop}</p> : <p>No shop parameter found.</p>}
      <p>If you see this page, the /dashboard route is working.</p>
    </div>
  );
}

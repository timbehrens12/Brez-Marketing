"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [shop, setShop] = useState<string | null>(null);

  useEffect(() => {
    const shopParam = searchParams.get("shop");
    setShop(shopParam);
    console.log("Minimal DashboardPage loaded. Shop parameter:", shopParam);
  }, [searchParams]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Dashboard Page</h1>
      {shop ? <p>Shop: {shop}</p> : <p>No shop parameter found.</p>}
      <p>This is a minimal page to test the route.</p>
    </div>
  );
}

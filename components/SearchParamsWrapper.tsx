"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface SearchParamsWrapperProps {
  onShopFound: (shop: string) => void;
}

export default function SearchParamsWrapper({ onShopFound }: SearchParamsWrapperProps) {
  // Always call useSearchParams unconditionally.
  const searchParams = useSearchParams();
  
  // Use state to track if the component is mounted.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Once mounted, use the search params.
  useEffect(() => {
    if (mounted) {
      const shop = searchParams.get("shop");
      if (shop) {
        onShopFound(shop);
      }
    }
  }, [mounted, searchParams, onShopFound]);

  // Always return null (or you can return a fragment) but do not conditionally
  // return before calling hooks.
  return null;
}

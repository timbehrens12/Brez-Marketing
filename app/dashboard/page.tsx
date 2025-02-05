"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

function DashboardContent() {
  const searchParams = useSearchParams()
  const shop = searchParams.get("shop")

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Shop Details</h2>
        <div>Shop: {shop}</div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}


import { Suspense } from "react"
import { DashboardContent } from "./dashboard-content"

// This is the dynamic shop-specific dashboard page
export default function ShopDashboardPage({
  params,
}: {
  params: { shop: string }
}) {
  return (
    <Suspense fallback={<div className="p-8">Loading shop details...</div>}>
      <DashboardContent shop={params.shop} />
    </Suspense>
  )
}


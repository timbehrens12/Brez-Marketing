import { Suspense } from "react"
import type React from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Suspense fallback={<div className="p-8">Loading dashboard...</div>}>{children}</Suspense>
}


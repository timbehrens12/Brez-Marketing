"use client"

import { useUser } from "@clerk/nextjs"
import { PlatformTabs } from "@/components/dashboard/PlatformTabs"
import { StoreSelector } from "@/components/StoreSelector"
import { DateRangePicker } from "@/components/DateRangePicker"
import { useState } from "react"
import { DateRange } from "react-day-picker"

export default function DashboardPage() {
  const { user } = useUser()
  const [selectedStore, setSelectedStore] = useState("")
  const [date, setDate] = useState<DateRange | undefined>()

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-4">
          <StoreSelector onStoreSelect={setSelectedStore} />
          <DateRangePicker date={date} onDateChange={setDate} />
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h2 className="text-white mb-4">🚀 Pinned: Quick access to your most important metrics</h2>
          <PlatformTabs />
        </div>
      </div>
    </div>
  )
}

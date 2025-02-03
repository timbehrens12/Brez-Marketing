"use client"

import type { ReactNode } from "react"
import type { DateRange } from "react-day-picker"
import { Sidebar } from "./Sidebar"
import { StoreSelector } from "./StoreSelector"
import { DateRangePicker } from "./DateRangePicker"
import { ComparisonPicker, type ComparisonType } from "@/components/ComparisonPicker"

interface LayoutProps {
  children: ReactNode
  onStoreSelect: (store: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (dateRange: DateRange | undefined) => void
  comparisonType: ComparisonType
  comparisonDateRange?: DateRange
  onComparisonChange: (type: ComparisonType, dateRange?: DateRange) => void
}

export function Layout({
  children,
  onStoreSelect,
  dateRange,
  onDateRangeChange,
  comparisonType,
  comparisonDateRange,
  onComparisonChange,
}: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <Sidebar />
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="bg-white border-b p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <StoreSelector onStoreSelect={onStoreSelect} />
            <div className="flex items-center space-x-4">
              <DateRangePicker date={dateRange} onDateChange={onDateRangeChange} />
              <ComparisonPicker
                comparisonType={comparisonType}
                customDateRange={comparisonDateRange}
                onComparisonChange={onComparisonChange}
              />
            </div>
          </div>
        </div>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}


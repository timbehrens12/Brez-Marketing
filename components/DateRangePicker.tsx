"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { format, subDays, isSameDay, isYesterday, isToday, startOfDay, endOfDay } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  setDateRange: (range: { from: Date; to: Date }) => void;
}

const presets = [
  {
    label: "Today",
    value: "today",
    getDate: () => {
      const today = new Date()
      const startOfToday = startOfDay(today)
      const endOfToday = endOfDay(today)
      return {
        from: startOfToday,
        to: endOfToday,
      }
    },
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getDate: () => {
      const yesterday = subDays(new Date(), 1)
      const startOfYesterday = startOfDay(yesterday)
      const endOfYesterday = endOfDay(yesterday)
      return {
        from: startOfYesterday,
        to: endOfYesterday,
      }
    },
  },
  {
    label: "Last 7 days",
    value: "last7",
    getDate: () => ({
      from: startOfDay(subDays(new Date(), 7)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Last 30 days",
    value: "last30",
    getDate: () => ({
      from: startOfDay(subDays(new Date(), 30)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Last 90 days",
    value: "last90",
    getDate: () => ({
      from: startOfDay(subDays(new Date(), 90)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Last 365 days",
    value: "last365",
    getDate: () => ({
      from: startOfDay(subDays(new Date(), 365)),
      to: endOfDay(new Date()),
    }),
  },
]

export function DateRangePicker({ dateRange, setDateRange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const getSelectedPresetLabel = (currentDate: DateRange): string => {
    if (!currentDate?.from || !currentDate?.to) return "Pick a date range"

    // Check for preset matches
    if (isToday(currentDate.from) && isToday(currentDate.to)) return "Today"
    if (isYesterday(currentDate.from) && isYesterday(currentDate.to)) return "Yesterday"

    // Check for other presets
    for (const preset of presets) {
      const presetDate = preset.getDate()
      if (isSameDay(currentDate.from, presetDate.from) && isSameDay(currentDate.to, presetDate.to)) {
        return preset.label
      }
    }

    // If no preset matches, show date range
    return `${format(currentDate.from, "LLL dd, y")} - ${format(currentDate.to, "LLL dd, y")}`
  }

  return (
    <div className="grid gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[260px] justify-start text-left font-normal bg-[#111111] text-white border-[#222222] hover:bg-[#222222]"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-white" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="space-y-4 p-4 bg-[#111111] text-white">
            <div className="border-r flex flex-col">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  variant="ghost"
                  className="w-full justify-start text-white hover:bg-[#222222]"
                  onClick={() => {
                    setDateRange(preset.getDate())
                    setIsOpen(false)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(newDateRange) => {
                if (newDateRange) {
                  setDateRange(newDateRange as { from: Date; to: Date })
                }
                setIsOpen(false)
              }}
              numberOfMonths={2}
              className="text-white [&_.rdp-day]:text-white [&_.rdp-day_button:hover]:bg-[#222222]"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}


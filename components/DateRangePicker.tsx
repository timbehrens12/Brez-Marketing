"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown } from "lucide-react"
import { format, subDays, isSameDay, isYesterday, isToday } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  date: DateRange | undefined
  onDateChange: (date: DateRange | undefined) => void
}

const presets = [
  {
    label: "Today",
    value: "today",
    getDate: () => {
      const today = new Date()
      return {
        from: today,
        to: today,
      }
    },
  },
  {
    label: "Yesterday",
    value: "yesterday",
    getDate: () => {
      const yesterday = subDays(new Date(), 1)
      return {
        from: yesterday,
        to: yesterday,
      }
    },
  },
  {
    label: "Last 7 days",
    value: "last7",
    getDate: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    value: "last30",
    getDate: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: "Last 90 days",
    value: "last90",
    getDate: () => ({
      from: subDays(new Date(), 90),
      to: new Date(),
    }),
  },
  {
    label: "Last 365 days",
    value: "last365",
    getDate: () => ({
      from: subDays(new Date(), 365),
      to: new Date(),
    }),
  },
]

export function DateRangePicker({ date, onDateChange }: DateRangePickerProps) {
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
            id="date"
            variant={"outline"}
            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? getSelectedPresetLabel(date) : "Pick a date range"}
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r flex flex-col">
              {presets.map((preset) => (
                <Button
                  key={preset.value}
                  variant="ghost"
                  className="w-full justify-start rounded-none h-7 px-2 text-sm font-normal hover:bg-accent"
                  onClick={() => {
                    onDateChange(preset.getDate())
                    setIsOpen(false)
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="p-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={onDateChange}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}


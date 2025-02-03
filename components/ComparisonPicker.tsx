"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"

export type ComparisonType = "none" | "previous_period" | "previous_year" | "custom"

interface ComparisonPickerProps {
  comparisonType: ComparisonType
  customDateRange?: DateRange
  onComparisonChange: (type: ComparisonType, dateRange?: DateRange) => void
}

const comparisonOptions = [
  {
    value: "none",
    label: "No comparison",
  },
  {
    value: "previous_period",
    label: "Previous period",
  },
  {
    value: "previous_year",
    label: "Previous year",
  },
]

export function ComparisonPicker({ comparisonType, customDateRange, onComparisonChange }: ComparisonPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(customDateRange)

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Compare to:</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-[180px] justify-between">
            {comparisonType === "custom"
              ? "Custom"
              : (comparisonOptions.find((option) => option.value === comparisonType)?.label ?? "Select comparison")}
            <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0">
          <Command>
            <CommandInput placeholder="Select comparison..." />
            <CommandList>
              <CommandEmpty>No comparison found.</CommandEmpty>
              <CommandGroup>
                {comparisonOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(value) => {
                      onComparisonChange(value as ComparisonType)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", comparisonType === option.value ? "opacity-100" : "opacity-0")}
                    />
                    {option.label}
                  </CommandItem>
                ))}
                <CommandItem
                  value="custom"
                  onSelect={() => {
                    setCalendarOpen(true)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", comparisonType === "custom" ? "opacity-100" : "opacity-0")} />
                  Custom
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
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
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={(range) => {
              setDateRange(range)
              if (range?.from && range?.to) {
                onComparisonChange("custom", range)
                setCalendarOpen(false)
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}


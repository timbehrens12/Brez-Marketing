"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { format, subDays, isSameDay, isYesterday, isToday, startOfDay, endOfDay, addMonths, subMonths, addYears, subYears, startOfMonth, isBefore, isAfter, isSameMonth } from "date-fns"
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
      // Use current time instead of end of day to avoid future times
      return {
        from: startOfToday,
        to: today,
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

// Custom Caption component that only shows the month name without the containers
function CustomCaption({ displayMonth }: { displayMonth: Date }) {
  return (
    <div className="flex justify-center py-2">
      <div className="text-sm font-medium">
        {format(displayMonth, "MMMM yyyy")}
      </div>
    </div>
  );
}

// Add this helper function before the DateRangePicker component
function isAfterOrSameMonth(date1: Date, date2: Date): boolean {
  if (date1.getFullYear() > date2.getFullYear()) return true;
  if (date1.getFullYear() < date2.getFullYear()) return false;
  return date1.getMonth() >= date2.getMonth();
}

export function DateRangePicker({ dateRange, setDateRange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange)
  const [selectionStep, setSelectionStep] = React.useState<'start' | 'end' | 'complete'>('start')
  const [currentMonth, setCurrentMonth] = React.useState<Date>(dateRange?.from || new Date())
  
  // Get current date for comparison
  const today = new Date()
  const currentMonthStart = startOfMonth(today)

  // Reset temp state when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setTempDateRange(dateRange)
      setSelectionStep('start')
      // Set current month to show current month on right, previous month on left
      setCurrentMonth(prevMonth => subMonths(new Date(), 1))
    }
  }, [isOpen, dateRange])

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

  const handleCalendarSelect = (newDateRange: DateRange | undefined) => {
    if (!newDateRange) return
    
    // Ensure no future dates are selected
    const now = new Date()
    let adjustedRange = { ...newDateRange }
    
    // If from date is in the future, set it to today
    if (adjustedRange.from && adjustedRange.from > now) {
      adjustedRange.from = startOfDay(now)
    }
    
    // If to date is in the future, set it to today
    if (adjustedRange.to && adjustedRange.to > now) {
      adjustedRange.to = now
    }
    
    setTempDateRange(adjustedRange)
    
    // If both from and to are selected, mark as complete
    if (adjustedRange.from && adjustedRange.to) {
      setSelectionStep('complete')
    } 
    // If only from is selected, prompt for end date
    else if (adjustedRange.from) {
      setSelectionStep('end')
    }
  }

  const handleApply = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      setDateRange({
        from: tempDateRange.from,
        to: tempDateRange.to
      })
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempDateRange(dateRange)
    setIsOpen(false)
  }

  const handlePresetSelect = (preset: typeof presets[0]) => {
    const newRange = preset.getDate()
    
    // Ensure no future dates are selected
    const now = new Date()
    if (newRange.to > now) {
      newRange.to = now
    }
    
    setTempDateRange(newRange)
    setSelectionStep('complete')
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1))
  }

  const handleNextMonth = () => {
    // Only allow navigating to next month if it's not beyond the current month
    const nextMonth = addMonths(currentMonth, 1)
    if (isSameMonth(startOfMonth(nextMonth), currentMonthStart) || isBefore(startOfMonth(nextMonth), currentMonthStart)) {
      setCurrentMonth(nextMonth)
    }
  }

  const handlePreviousYear = () => {
    setCurrentMonth(prevMonth => subYears(prevMonth, 1))
  }

  const handleNextYear = () => {
    // Only allow navigating to next year if it's not beyond the current month/year
    const nextYear = addYears(currentMonth, 1)
    if (isSameMonth(startOfMonth(nextYear), currentMonthStart) || isBefore(startOfMonth(nextYear), currentMonthStart)) {
      setCurrentMonth(nextYear)
    }
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
            <div className="flex">
              <div className="border-r pr-4 flex flex-col space-y-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-[#222222]"
                    onClick={() => {
                      handlePresetSelect(preset)
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="pl-4 flex-1">
                {/* Month navigation controls - simplified */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex space-x-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7 bg-[#222222] hover:bg-[#333333]"
                      onClick={handlePreviousYear}
                      title="Previous Year"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Year</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7 bg-[#222222] hover:bg-[#333333]"
                      onClick={handlePreviousMonth}
                      title="Previous Month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous Month</span>
                    </Button>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7 bg-[#222222] hover:bg-[#333333]"
                      onClick={handleNextMonth}
                      title="Next Month"
                      disabled={isAfterOrSameMonth(addMonths(startOfMonth(currentMonth), 1), currentMonthStart)}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next Month</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7 bg-[#222222] hover:bg-[#333333]"
                      onClick={handleNextYear}
                      title="Next Year"
                      disabled={isAfterOrSameMonth(addYears(startOfMonth(currentMonth), 1), currentMonthStart)}
                    >
                      <ChevronsRight className="h-4 w-4" />
                      <span className="sr-only">Next Year</span>
                    </Button>
                  </div>
                </div>
                
                <Calendar
                  initialFocus
                  mode="range"
                  month={currentMonth}
                  defaultMonth={currentMonth}
                  selected={tempDateRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                  showOutsideDays={false}
                  disabled={{ after: new Date() }}
                  fromMonth={undefined}
                  toMonth={today}
                  className="text-white [&_.rdp-day]:text-white [&_.rdp-day_button:hover]:bg-[#222222] [&_.rdp-head_row]:!hidden [&_.rdp-head_cell]:!hidden [&_th]:!hidden"
                  components={{
                    IconLeft: () => null,
                    IconRight: () => null,
                    Caption: CustomCaption
                  }}
                />
                <div className="text-xs text-gray-400 mt-2 italic">
                  Future dates are disabled. You can only select dates up to today.
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#222222]">
              <Button 
                variant="outline" 
                className="bg-[#222222] hover:bg-[#333333] text-white"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!tempDateRange?.from || !tempDateRange?.to}
                onClick={handleApply}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 
"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { format, subDays, isSameDay, isYesterday, isToday, startOfDay, endOfDay, addMonths, subMonths, addYears, subYears, startOfMonth, isBefore, isAfter, isSameMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Add custom styles to hide the default navigation buttons
const calendarStyles = `
  .rdp-nav_button {
    display: none !important;
  }
`;

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

interface DateRangePickerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  setDateRange: (range: { from: Date; to: Date }) => void;
}

const presets = [
  {
    name: 'Today',
    value: 'today',
    getDate: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date())
    })
  },
  {
    name: 'Yesterday',
    value: 'yesterday',
    getDate: () => {
      // Create yesterday's date
      const yesterday = subDays(new Date(), 1);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      
      return {
        from: yesterdayStart,
        to: yesterdayEnd
      };
    }
  },
  {
    name: 'Last 7 days',
    value: 'last7',
    getDate: () => {
      // Last 7 completed days (excluding today)
      const today = new Date();
      return {
        from: startOfDay(subDays(today, 7)),
        to: endOfDay(subDays(today, 1))
      };
    }
  },
  {
    name: 'Last 14 days',
    value: 'last14',
    getDate: () => {
      // Last 14 completed days (excluding today)
      const today = new Date();
      return {
        from: startOfDay(subDays(today, 14)),
        to: endOfDay(subDays(today, 1))
      };
    }
  },
  {
    name: 'Last 30 days',
    value: 'last30',
    getDate: () => {
      // Last 30 completed days (excluding today)
      const today = new Date();
      return {
        from: startOfDay(subDays(today, 30)),
        to: endOfDay(subDays(today, 1))
      };
    }
  },
  {
    name: 'This week',
    value: 'thisWeek',
    getDate: () => {
      const today = new Date();
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }), // Week starts on Monday
        to: endOfDay(today)
      };
    }
  },
  {
    name: 'Last week',
    value: 'lastWeek',
    getDate: () => {
      const today = new Date();
      const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
      return {
        from: lastWeekStart,
        to: lastWeekEnd
      };
    }
  },
  {
    name: 'This month',
    value: 'thisMonth',
    getDate: () => ({
      from: startOfDay(startOfMonth(new Date())),
      to: endOfDay(new Date())
    })
  },
  {
    name: 'Last month',
    value: 'lastMonth',
    getDate: () => ({
      from: startOfDay(startOfMonth(subMonths(new Date(), 1))),
      to: endOfDay(endOfMonth(subMonths(new Date(), 1)))
    })
  },
  {
    name: 'Maximum',
    value: 'maximum',
    getDate: () => {
      // Assuming we want to go back a reasonable amount, like 2 years
      const today = new Date();
      return {
        from: startOfDay(subYears(today, 2)),
        to: endOfDay(today)
      };
    }
  }
];

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
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null)
  
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
      
      // Find if current date range matches any preset
      setSelectedPreset(null)
      for (const preset of presets) {
        const presetDate = preset.getDate()
        if (
          dateRange?.from && dateRange?.to && 
          isSameDay(dateRange.from, presetDate.from) && 
          isSameDay(dateRange.to, presetDate.to)
        ) {
          setSelectedPreset(preset.value)
          break
        }
      }
    }
  }, [isOpen, dateRange])

  const getSelectedPresetLabel = (currentDate: DateRange): string => {
    if (!currentDate?.from || !currentDate?.to) return "Pick a date range"

    // If from and to are the same date, just show that date
    if (isSameDay(currentDate.from, currentDate.to)) {
      return format(currentDate.from, "LLL dd, y")
    }

    // Check for preset matches
    if (isToday(currentDate.from) && isToday(currentDate.to)) return "Today"
    if (isYesterday(currentDate.from) && isYesterday(currentDate.to)) return "Yesterday"

    // Check for other presets
    for (const preset of presets) {
      const presetDate = preset.getDate()
      if (isSameDay(currentDate.from, presetDate.from) && isSameDay(currentDate.to, presetDate.to)) {
        return preset.name
      }
    }

    // If no preset matches, show custom date range
    return `Custom: ${format(currentDate.from, "LLL dd, y")} - ${format(currentDate.to, "LLL dd, y")}`
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
    
    // When the first date is clicked, set both from and to to the same date
    if (selectionStep === 'start' && adjustedRange.from) {
      adjustedRange.to = adjustedRange.from
      setSelectionStep('complete')
    } 
    // When second click happens
    else if (selectionStep === 'end' && adjustedRange.from && adjustedRange.to) {
      setSelectionStep('complete')
    }
    
    setTempDateRange(adjustedRange)
    
    // When user selects dates manually, set to custom
    setSelectedPreset('custom')
  }

  const handlePresetSelect = (preset: typeof presets[0]) => {
    // Get the date range from the preset
    const newRange = preset.getDate()
    
    // Ensure no future dates are selected
    const now = new Date()
    if (newRange.to > now) {
      newRange.to = now
    }
    
    setTempDateRange(newRange)
    setSelectionStep('complete')
    setSelectedPreset(preset.value)
    
    // Apply immediately when a preset is selected
    setDateRange({
      from: newRange.from,
      to: newRange.to
    })
    setIsOpen(false)
  }

  const handleApply = () => {
    if (tempDateRange?.from) {
      // If only from date is selected, use same date for both
      const finalRange = {
        from: tempDateRange.from,
        to: tempDateRange.to || tempDateRange.from
      };
      
      setDateRange(finalRange);
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setTempDateRange(dateRange)
    setIsOpen(false)
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
              getSelectedPresetLabel(dateRange)
            ) : (
              <span>Pick a date</span>
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
                    variant={selectedPreset === preset.value ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start text-white",
                      selectedPreset === preset.value 
                        ? "bg-blue-600 hover:bg-blue-700" 
                        : "hover:bg-[#222222]"
                    )}
                    onClick={() => {
                      handlePresetSelect(preset)
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
                {/* Custom option */}
                <Button
                  key="custom"
                  variant={selectedPreset === 'custom' ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start text-white",
                    selectedPreset === 'custom' 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "hover:bg-[#222222]"
                  )}
                  onClick={() => {
                    setSelectedPreset('custom')
                  }}
                >
                  Custom
                </Button>
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
                
                {selectionStep === 'end' && (
                  <div className="text-sm text-blue-400 mb-2">
                    {/* Clicking again will select a range */}
                    Select end date or click the same date for single-day selection
                  </div>
                )}
                
                <Calendar
                  initialFocus
                  mode="range"
                  month={currentMonth}
                  defaultMonth={currentMonth}
                  selected={tempDateRange}
                  onSelect={(range) => {
                    if (!range) return;
                    
                    // When first clicking a date
                    if (!range.to && range.from) {
                      // Auto-select same date for both from and to on first click
                      const singleDateRange = { from: range.from, to: range.from };
                      handleCalendarSelect(singleDateRange);
                      return;
                    }
                    
                    // When clicking a second time
                    handleCalendarSelect(range);
                  }}
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
                disabled={!tempDateRange?.from}
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


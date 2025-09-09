"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { format, subDays, isSameDay, isYesterday, isToday, startOfDay, endOfDay, addMonths, subMonths, addYears, subYears, startOfMonth, isBefore, isAfter, isSameMonth, endOfMonth } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"


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
  disabled?: boolean;
}

// Get user's timezone - the backend can handle any timezone
const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

const presets = [
  {
    name: 'Today',
    value: 'today',
    getDate: () => {
      // Use current date in user's timezone
      const now = new Date()
      
      return {
        from: startOfDay(now),
        to: endOfDay(now)
      }
    }
  },
  {
    name: 'Yesterday',
    value: 'yesterday',
    getDate: () => {
      // Get yesterday's date in user's timezone
      const now = new Date()
      const yesterday = subDays(now, 1)
      const yesterdayStart = startOfDay(yesterday)
      
      // Add a special parameter to the date object - use the same date for both
      const date = {
        from: yesterdayStart,
        to: yesterdayStart, // Use same date for both to prevent API confusion
        // Add a property to identify this as the yesterday preset
        _preset: 'yesterday'
      };
      
      return date;
    }
  },
  {
    name: 'Last 7 days',
    value: 'last7',
    getDate: () => {
      const today = new Date();
      // Use startOfDay for the end date (yesterday) to avoid timezone rollover
      const yesterdayStart = startOfDay(subDays(today, 1));
      const sevenDaysAgoStart = startOfDay(subDays(today, 7));
      
              // console.log(`Setting last 7 days: ${format(sevenDaysAgoStart, 'yyyy-MM-dd')} to ${format(yesterdayStart, 'yyyy-MM-dd')}`);
      
      return {
        from: sevenDaysAgoStart,
        to: yesterdayStart // Use start of yesterday
      };
    }
  },
  {
    name: 'Last 30 days',
    value: 'last30',
    getDate: () => {
      const today = new Date();
      // Use startOfDay for the end date (yesterday) to avoid timezone rollover
      const yesterdayStart = startOfDay(subDays(today, 1));
      const thirtyDaysAgoStart = startOfDay(subDays(today, 30));
      
              // console.log(`Setting last 30 days: ${format(thirtyDaysAgoStart, 'yyyy-MM-dd')} to ${format(yesterdayStart, 'yyyy-MM-dd')}`);
      
      return {
        from: thirtyDaysAgoStart,
        to: yesterdayStart // Use start of yesterday
      };
    }
  },
  {
    name: 'This week',
    value: 'thisWeek',
    getDate: () => {
      // Get the current date
      const today = new Date();
      
      // Ensure we're using the current date, not any cached or future date
      const safeToday = new Date(); // Fresh date to avoid any issues
      
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = safeToday.getDay();
      
      // Calculate the first day of the week (Sunday)
      const startDate = new Date(safeToday);
      startDate.setDate(safeToday.getDate() - dayOfWeek);
      
      // Create proper DateRange object with the entire week
      const dateRange = {
        from: startOfDay(startDate),
        to: endOfDay(safeToday)
      };
      
      // Add detailed logging for debugging
      // console.log(`"This week" calculation:`, {
      //   today: safeToday.toISOString(),
      //   dayOfWeek,
      //   startDate: dateRange.from.toISOString(),
      //   endDate: dateRange.to.toISOString(),
      //   startFormatted: format(dateRange.from, 'yyyy-MM-dd'),
      //   endFormatted: format(dateRange.to, 'yyyy-MM-dd')
      // });
      
      return dateRange;
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
    getDate: () => {
      const today = new Date();
      const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfPreviousMonth = new Date(firstDayOfCurrentMonth);
      lastDayOfPreviousMonth.setDate(lastDayOfPreviousMonth.getDate() - 1);
      const firstDayOfPreviousMonth = new Date(lastDayOfPreviousMonth.getFullYear(), lastDayOfPreviousMonth.getMonth(), 1);
      
      // console.log(`Setting last month: ${format(firstDayOfPreviousMonth, 'yyyy-MM-dd')} to ${format(lastDayOfPreviousMonth, 'yyyy-MM-dd')}`);
      
      return {
        from: startOfDay(firstDayOfPreviousMonth),
        // Use startOfDay for the end date to avoid timezone rollover
        to: startOfDay(lastDayOfPreviousMonth) 
      };
    }
  },
  {
    name: 'This year',
    value: 'thisYear',
    getDate: () => {
      const now = new Date();
      return {
        from: startOfDay(new Date(now.getFullYear(), 0, 1)),
        to: endOfDay(now)
      };
    }
  },
  {
    name: 'Last year',
    value: 'lastYear',
    getDate: () => {
      const lastYear = new Date().getFullYear() - 1;
      const firstDayOfLastYear = new Date(lastYear, 0, 1);
      const lastDayOfLastYear = new Date(lastYear, 11, 31);
      
      // console.log(`Setting last year: ${format(firstDayOfLastYear, 'yyyy-MM-dd')} to ${format(lastDayOfLastYear, 'yyyy-MM-dd')}`);
      
      return {
        from: startOfDay(firstDayOfLastYear),
        // Use startOfDay for the end date to avoid timezone rollover
        to: startOfDay(lastDayOfLastYear)
      };
    }
  }
];

function isAfterOrSameMonth(date1: Date, date2: Date): boolean {
  if (date1.getFullYear() > date2.getFullYear()) return true;
  if (date1.getFullYear() < date2.getFullYear()) return false;
  return date1.getMonth() >= date2.getMonth();
}

export function DateRangePicker({ dateRange, setDateRange, disabled = false }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange)
  const [selectionStep, setSelectionStep] = React.useState<'start' | 'end' | 'complete'>('start')
  const [currentMonth, setCurrentMonth] = React.useState<Date>(dateRange?.from || new Date())
  const [activePreset, setActivePreset] = React.useState<string | null>(null)
  
  // Get current date for comparison
  const today = new Date()
  const currentMonthStart = startOfMonth(today)

  // Reset temp state when popover opens
  React.useEffect(() => {
    if (isOpen) {
      setTempDateRange(dateRange)
      setSelectionStep('start')
      // Set current month to show the month of the selected date range, or current month if no selection
      const monthToShow = dateRange?.from ? startOfMonth(dateRange.from) : subMonths(new Date(), 1)
      setCurrentMonth(monthToShow)
      
      // Determine if the current dateRange matches any preset
      setActivePreset(getActivePresetFromDateRange(dateRange))
    }
  }, [isOpen, dateRange])

  // Helper function to determine which preset matches the current date range
  const getActivePresetFromDateRange = (range: DateRange | undefined): string | null => {
    if (!range?.from || !range?.to) return null
    
    for (const preset of presets) {
      const presetRange = preset.getDate()
      if (
        isSameDay(range.from, presetRange.from) && 
        isSameDay(range.to, presetRange.to)
      ) {
        return preset.value
      }
    }
    
    return null // No matching preset found
  }

  const getSelectedPresetLabel = (currentDate: DateRange): string => {
    if (!currentDate?.from || !currentDate?.to) return "Pick a date range"

    // If from and to are the same date, just show that date
    if (isSameDay(currentDate.from, currentDate.to)) {
      return format(currentDate.from, "LLL dd, y")
    }
    
    // If active preset is set, use its name
    if (activePreset) {
      const preset = presets.find(p => p.value === activePreset)
      if (preset) return preset.name
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

    // If no preset matches, show date range and mark as custom
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
    
    // When the first date is clicked, set both from and to to the same date
    if (selectionStep === 'start' && adjustedRange.from) {
      adjustedRange.to = adjustedRange.from
      setSelectionStep('complete')
    } 
    // When second click happens
    else if (selectionStep === 'end' && adjustedRange.from && adjustedRange.to) {
      setSelectionStep('complete')
    }
    
    // Clear active preset since user has manually selected dates
    setActivePreset(null)
    
    setTempDateRange(adjustedRange)
  }

  const handlePresetSelect = (preset: typeof presets[0]) => {
    if (disabled) return; // Prevent changes when disabled
    
    // Get the date range from the preset
    const newRange = preset.getDate()
    
    // Ensure no future dates are selected
    const now = new Date()
    if (newRange.to > now) {
      newRange.to = now
    }
    
    // Extra handling for specific presets to ensure proper date ranges
    if (preset.value === 'yesterday') {
      // Create yesterday's date
      const yesterday = subDays(new Date(), 1);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      
      // Ensure both from and to are exactly the same date for the API
      newRange.from = yesterdayStart;
      newRange.to = yesterdayStart; // Use start of day for both to avoid date mismatch
      
      // Keep the special marker using type assertion
      (newRange as any)._preset = 'yesterday';
      
      console.log(`Setting yesterday preset with special marker - exact same date for both`);
      console.log(`Yesterday date used: ${yesterdayStart.toISOString().split('T')[0]}`);
    }
    else if (preset.value === 'thisWeek') {
      // Additional validation for this week preset
      const today = new Date();
      const dayOfWeek = today.getDay();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek);
      
      // Override the dates just to be sure
      newRange.from = startOfDay(startDate);
      newRange.to = endOfDay(today);
      
      console.log(`Setting this week preset with explicit date calculation`);
      console.log(`Date range: ${format(newRange.from, 'yyyy-MM-dd')} to ${format(newRange.to, 'yyyy-MM-dd')}`);
    }
    
    // Set the active preset
    setActivePreset(preset.value)
    
    
    setTempDateRange(newRange)
    setSelectionStep('complete')
    
    // Apply immediately when a preset is selected
    setDateRange({
      from: newRange.from,
      to: newRange.to
    })
    setIsOpen(false)
  }

  const handleApply = () => {
    if (disabled) return; // Prevent changes when disabled
    
    if (tempDateRange?.from) {
      // If only from date is selected, use same date for both
      const finalRange = {
        from: tempDateRange.from,
        to: tempDateRange.to || tempDateRange.from
      };
      
      // Log what we're applying
      console.log('Applying date range:', {
        from: finalRange.from.toISOString().split('T')[0],
        to: finalRange.to.toISOString().split('T')[0]
      });
      
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
      <Popover open={isOpen && !disabled} onOpenChange={(open) => !disabled && setIsOpen(open)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "min-w-[260px] w-auto max-w-[320px] justify-between text-left font-normal bg-[#1A1A1A] text-gray-400 border-[#333]",
              disabled 
                ? "opacity-60 cursor-not-allowed" 
                : "hover:bg-[#222] hover:text-white"
            )}
          >
            <div className="flex items-center flex-1 min-w-0">
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {dateRange?.from ? (
                  getSelectedPresetLabel(dateRange)
                ) : (
                  "Pick a date"
                )}
              </span>
            </div>
            {disabled && (
              <span className="ml-2 text-xs text-gray-500 flex-shrink-0">(Loading...)</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 data-[state=closed]:animate-none data-[state=open]:animate-none" 
          align="start"
          forceMount
          sideOffset={5}
        >
          <div className="space-y-4 p-4 bg-[#111111] text-white rounded-md border border-[#222222]">
            <div className="flex">
              <div className="border-r pr-4 flex flex-col space-y-1">
                {presets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="ghost"
                    className={`w-full justify-start text-white hover:bg-[#222222] ${
                      activePreset === preset.value ? 'bg-[#222222] border-l-2 border-blue-500 pl-3' : ''
                    }`}
                    onClick={() => {
                      handlePresetSelect(preset)
                    }}
                  >
                    {preset.name}
                  </Button>
                ))}
                
                {/* Add a Custom option that becomes selected when dates are manually chosen */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-white hover:bg-[#222222] ${
                    tempDateRange?.from && tempDateRange?.to && !activePreset ? 'bg-[#222222] border-l-2 border-blue-500 pl-3' : ''
                  }`}
                  onClick={() => {
                    // Custom dates already selected - just apply them
                    if (tempDateRange?.from && tempDateRange?.to) {
                      setActivePreset(null)
                      handleApply()
                    }
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
                      
                      // Since user manually selected a date, clear active preset
                      setActivePreset(null);
                      return;
                    }
                    
                    // When clicking a second time
                    handleCalendarSelect(range);
                    
                    // Since user manually selected a date range, clear active preset
                    setActivePreset(null);
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


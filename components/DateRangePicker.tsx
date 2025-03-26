"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { format, subDays, isSameDay, isYesterday, isToday, startOfDay, endOfDay, addMonths, subMonths, addYears, subYears, startOfMonth, isBefore, isAfter, isSameMonth, endOfMonth } from "date-fns"
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
      
      // Format dates as ISO strings with 'yesterday' marker
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      
      // Add a special parameter to the date object
      const date = {
        from: yesterdayStart,
        to: yesterdayEnd,
        // Add a property to identify this as the yesterday preset
        _preset: 'yesterday'
      };
      
      console.log('Setting yesterday preset with special marker');
      
      return date;
    }
  },
  {
    name: 'Last 7 days',
    value: 'last7',
    getDate: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date())
    })
  },
  {
    name: 'Last 30 days',
    value: 'last30',
    getDate: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date())
    })
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

    // If no preset matches, show date range
    return `${format(currentDate.from, "LLL dd, y")} - ${format(currentDate.to, "LLL dd, y")}`
  }

  const handleCalendarSelect = (newDateRange: DateRange | undefined) => {
    if (!newDateRange) return
    
    // Log the raw selection
    console.log('Calendar selection:', {
      from: newDateRange.from?.toISOString(),
      to: newDateRange.to?.toISOString()
    });
    
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
    
    // First click always sets a single date
    if (selectionStep === 'start' && adjustedRange.from) {
      // Auto-select same date for both from and to on first click
      const exactDay = adjustedRange.from.toISOString().split('T')[0];
      
      // Create proper time boundaries for the single day
      adjustedRange.from = new Date(exactDay + 'T00:00:00.000Z');
      adjustedRange.to = new Date(exactDay + 'T23:59:59.999Z');
      
      console.log('Single date selected (first click):', {
        date: exactDay,
        from: adjustedRange.from.toISOString(),
        to: adjustedRange.to.toISOString()
      });
      
      setSelectionStep('complete');
    } 
    // When second click happens
    else if (selectionStep === 'end' && adjustedRange.from && adjustedRange.to) {
      // Check if this is a single-day selection (both dates on same day)
      const fromDateStr = adjustedRange.from.toISOString().split('T')[0];
      const toDateStr = adjustedRange.to.toISOString().split('T')[0];
      const isSingleDaySelection = fromDateStr === toDateStr;
      
      if (isSingleDaySelection) {
        // Create proper time boundaries for the single day
        adjustedRange.from = new Date(fromDateStr + 'T00:00:00.000Z');
        adjustedRange.to = new Date(fromDateStr + 'T23:59:59.999Z');
        
        console.log('Single day range selected:', {
          date: fromDateStr,
          from: adjustedRange.from.toISOString(),
          to: adjustedRange.to.toISOString()
        });
      } else {
        // For a date range, ensure from date starts at beginning of day
        // and to date ends at end of day
        adjustedRange.from = startOfDay(adjustedRange.from);
        adjustedRange.to = endOfDay(adjustedRange.to);
        
        console.log('Date range selected:', {
          fromDate: fromDateStr,
          toDate: toDateStr,
          from: adjustedRange.from.toISOString(),
          to: adjustedRange.to.toISOString()
        });
      }
      
      setSelectionStep('complete')
    }
    
    setTempDateRange(adjustedRange)
  }

  const handlePresetSelect = (preset: typeof presets[0]) => {
    // Get the date range from the preset
    const newRange = preset.getDate()
    
    // Ensure no future dates are selected
    const now = new Date()
    if (newRange.to > now) {
      newRange.to = now
    }
    
    // Special handling for single-day presets (Today, Yesterday)
    const isSingleDayPreset = preset.value === 'today' || preset.value === 'yesterday'
    
    // Important: explicitly log what we're setting to help with debugging
    console.log(`Setting date range from preset ${preset.value}: `, {
      from: newRange.from.toISOString(),
      to: newRange.to.toISOString(),
      fromDate: newRange.from.toISOString().split('T')[0],
      toDate: newRange.to.toISOString().split('T')[0],
      isSingleDayPreset
    });
    
    // When selecting a single day preset, ensure the dates are strictly equal
    if (isSingleDayPreset) {
      // For single-day presets, ensure the to date is exactly the same as the from date
      // This guarantees backend will treat it as a single-day query
      const exactDay = newRange.from.toISOString().split('T')[0];
      
      console.log(`Setting STRICT single day for ${preset.value}: ${exactDay}`);
      
      // Create a new date object with the exact same date for both from and to
      newRange.from = new Date(exactDay + 'T00:00:00.000Z');
      newRange.to = new Date(exactDay + 'T23:59:59.999Z');
    }
    
    setTempDateRange(newRange)
    setSelectionStep('complete')
    
    // Apply immediately when a preset is selected
    setDateRange({
      from: newRange.from,
      to: newRange.to
    })
    
    // Update URL to include the preset parameter
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);
      
      // Extract just the date portion (YYYY-MM-DD) for the URL parameters
      const fromDate = newRange.from.toISOString().split('T')[0];
      const toDate = isSingleDayPreset 
        ? fromDate // For single-day presets, use exactly the same date string for both
        : newRange.to.toISOString().split('T')[0];
      
      // Add from and to date parameters
      params.set('from', fromDate);
      params.set('to', toDate);
      
      // Add the preset parameter - this is critical for proper backend handling
      params.set('preset', preset.value);
      
      // Update the URL without refreshing the page
      url.search = params.toString();
      window.history.pushState({}, '', url.toString());
      
      console.log(`Updated URL for preset ${preset.value}: ${url.toString()}`);
      console.log(`URL params: from=${fromDate}, to=${toDate}, preset=${preset.value}`);
    }
    
    setIsOpen(false)
  }

  const handleApply = () => {
    if (tempDateRange?.from) {
      // If only from date is selected, use same date for both
      const finalRange = {
        from: tempDateRange.from,
        to: tempDateRange.to || tempDateRange.from
      };
      
      // Check if this is a single day selection (same date for both from and to)
      const fromDateStr = finalRange.from.toISOString().split('T')[0];
      const toDateStr = finalRange.to.toISOString().split('T')[0];
      const isSingleDaySelection = fromDateStr === toDateStr;
      
      // Log what we're applying with detail
      console.log('Applying manual date range selection:', {
        from: finalRange.from.toISOString(),
        to: finalRange.to.toISOString(), 
        fromDate: fromDateStr,
        toDate: toDateStr,
        isSingleDaySelection
      });
      
      // For single day selections, ensure the time components are correct
      if (isSingleDaySelection) {
        console.log(`Single day selection detected: ${fromDateStr}`);
        
        // Create new date objects for precise time control
        finalRange.from = new Date(fromDateStr + 'T00:00:00.000Z');
        finalRange.to = new Date(fromDateStr + 'T23:59:59.999Z');
        
        // Verify we did it correctly
        console.log('Adjusted single day time range:', {
          from: finalRange.from.toISOString(),
          to: finalRange.to.toISOString()
        });
      }
      
      setDateRange(finalRange);
      
      // Update URL with the selected date range, but REMOVE preset parameter
      // since this is a manual date selection, not a preset
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        
        // For single day selections, ensure both dates are exactly the same string
        // This is critical for proper backend handling
        
        // Add from and to date parameters
        params.set('from', fromDateStr);
        params.set('to', isSingleDaySelection ? fromDateStr : toDateStr);
        
        // Remove preset parameter if it exists (critical for backend handling)
        if (params.has('preset')) {
          params.delete('preset');
        }
        
        // Update the URL without refreshing the page
        url.search = params.toString();
        window.history.pushState({}, '', url.toString());
        
        console.log(`Updated URL with custom date range: ${url.toString()}`);
        console.log(`URL params: from=${fromDateStr}, to=${isSingleDaySelection ? fromDateStr : toDateStr}`);
      }
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
                    variant="ghost"
                    className="w-full justify-start text-white hover:bg-[#222222]"
                    onClick={() => {
                      handlePresetSelect(preset)
                    }}
                  >
                    {preset.name}
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
                    
                    console.log('Raw calendar selection:', range);
                    
                    // When first clicking a date (only the 'from' date is set)
                    if (range.from && !range.to) {
                      console.log('First click detected - auto selecting as single day');
                      
                      // Get the ISO date string (YYYY-MM-DD)
                      const exactDay = range.from.toISOString().split('T')[0];
                      
                      // Create a proper single day range (start of day to end of day)
                      const singleDateRange = { 
                        from: new Date(exactDay + 'T00:00:00.000Z'), 
                        to: new Date(exactDay + 'T23:59:59.999Z') 
                      };
                      
                      console.log('Created single day selection:', {
                        date: exactDay,
                        from: singleDateRange.from.toISOString(),
                        to: singleDateRange.to.toISOString()
                      });
                      
                      handleCalendarSelect(singleDateRange);
                      return;
                    }
                    
                    // When clicking a second time - check if it's the same day
                    if (range.from && range.to) {
                      const fromDay = range.from.toISOString().split('T')[0];
                      const toDay = range.to.toISOString().split('T')[0];
                      
                      console.log('Two dates selected:', { fromDay, toDay });
                      
                      // If the same day is selected twice, treat as a single day selection
                      if (fromDay === toDay) {
                        console.log('Same day selected twice - handling as single day');
                        
                        const singleDateRange = {
                          from: new Date(fromDay + 'T00:00:00.000Z'),
                          to: new Date(fromDay + 'T23:59:59.999Z')
                        };
                        
                        handleCalendarSelect(singleDateRange);
                        return;
                      }
                    }
                    
                    // Otherwise handle as a normal range
                    handleCalendarSelect(range);
                  }}
                  numberOfMonths={2}
                  showOutsideDays={false}
                  disabled={{ after: new Date() }}
                  fromMonth={undefined}
                  toMonth={today}
                  className="text-white [&_.rdp-day]:text-white [&_.rdp-day_button:hover]:bg-[#222222] [&_.rdp-head_row]:!hidden [&_.rdp-head_cell]:!hidden [&_th]:!hidden"
                  // Hide today style by using a custom day styling
                  modifiersClassNames={{
                    today: 'bg-transparent'
                  }}
                  modifiersStyles={{
                    // Make selected days more prominent
                    selected: {
                      backgroundColor: '#374151',
                      color: 'white',
                      fontWeight: 'bold'
                    }
                  }}
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


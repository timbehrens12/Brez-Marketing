"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { format, parseISO, isToday, isYesterday, isSameDay, differenceInDays } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { useMemo } from 'react'
import type { DateRange } from 'react-day-picker'
import type { MetricData } from '@/types/metrics'

interface MetricLineChartProps {
  data: MetricData[]
  dateRange?: DateRange
  valuePrefix?: string
  valueSuffix?: string
  valueFormat?: "number" | "percentage" | "currency"
  color?: string
}

export function MetricLineChart({ 
  data, 
  dateRange, 
  valuePrefix = "", 
  valueSuffix = "",
  valueFormat = "number",
  color = "#4ade80" 
}: MetricLineChartProps) {
  const userTimeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  
  // Determine if we're looking at a single day (today or yesterday)
  const isSingleDayView = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return false;
    return isSameDay(dateRange.from, dateRange.to);
  }, [dateRange]);

  // Calculate date range span in days
  const dateRangeSpan = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 7; // Default to a week
    return Math.max(1, differenceInDays(dateRange.to, dateRange.from) + 1);
  }, [dateRange]);

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // For single day view, group by hour
    if (isSingleDayView) {
      // Create 24 hour buckets (0-23)
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        displayHour: i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i-12}pm`,
        value: 0,
        formattedDate: dateRange?.from ? format(dateRange.from, 'MMM dd') : ''
      }));

      // Fill in the data
      data.forEach(item => {
        try {
          // Validate date string before parsing
          if (!item.date || typeof item.date !== 'string') {
            console.error('Invalid date value:', item.date);
            return; // Skip this item
          }
          
          // Try to parse the date safely
          const date = parseISO(item.date);
          
          // Verify the date is valid before proceeding
          if (isNaN(date.getTime())) {
            console.error('Invalid date after parsing:', item.date);
            return; // Skip this item
          }
          
          const localDate = toZonedTime(date, userTimeZone);
          const hour = localDate.getHours();
          
          // Add to the appropriate hour bucket
          if (hour >= 0 && hour < 24) {
            hourlyData[hour].value += item.value;
          }
        } catch (error) {
          console.error('Error processing date for hourly chart:', error, 'Date value:', item.date);
        }
      });

      return hourlyData;
    } 
    // For multi-day view, use daily data
    else {
      // Create a map to aggregate values by date
      const dateMap = new Map();
      
      // If we have a date range, create empty entries for each day in the range
      if (dateRange?.from && dateRange?.to) {
        let currentDate = new Date(dateRange.from);
        while (currentDate <= dateRange.to) {
          const dateKey = format(currentDate, 'yyyy-MM-dd');
          dateMap.set(dateKey, {
            date: dateKey,
            displayDate: format(currentDate, 'MMM dd'),
            value: 0,
            rawDate: new Date(currentDate)
          });
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // Fill in the data
      data.forEach(item => {
        try {
          // Validate date string before parsing
          if (!item.date || typeof item.date !== 'string') {
            console.error('Invalid date value:', item.date);
            return; // Skip this item
          }
          
          // Try to parse the date safely
          const date = parseISO(item.date);
          
          // Verify the date is valid before proceeding
          if (isNaN(date.getTime())) {
            console.error('Invalid date after parsing:', item.date);
            return; // Skip this item
          }
          
          // Format to YYYY-MM-DD for consistent grouping
          const dateKey = format(date, 'yyyy-MM-dd');
          
          if (dateMap.has(dateKey)) {
            // Update existing entry
            const existing = dateMap.get(dateKey);
            existing.value += item.value;
          } else {
            // Create new entry if not in date range
            dateMap.set(dateKey, {
              date: dateKey,
              displayDate: format(date, 'MMM dd'),
              value: item.value,
              rawDate: new Date(date)
            });
          }
        } catch (error) {
          console.error('Error processing date for daily chart:', error, 'Date value:', item.date);
        }
      });
      
      // Convert map to array and sort by date
      return Array.from(dateMap.values())
        .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    }
  }, [data, isSingleDayView, userTimeZone, dateRange]);

  // Calculate Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 10];
    
    const maxValue = Math.max(...chartData.map(item => item.value));
    // Add 10% padding to the top
    return [0, Math.ceil(maxValue * 1.1)];
  }, [chartData]);

  // Format value for tooltip and y-axis
  const formatValue = (value: number) => {
    switch (valueFormat) {
      case "percentage":
        return `${valuePrefix}${value.toFixed(1)}${valueSuffix}`;
      case "currency":
        return `${valuePrefix}$${value.toLocaleString('en-US', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 0 
        })}${valueSuffix}`;
      default:
        return `${valuePrefix}${value.toLocaleString()}${valueSuffix}`;
    }
  };

  // Format for Y-axis ticks
  const formatYAxis = (value: number) => {
    if (valueFormat === "currency") {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      } else {
        return `$${value}`;
      }
    } else if (valueFormat === "percentage") {
      return `${value}%`;
    } else {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K`;
      }
      return value.toString();
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded p-2 text-xs shadow-lg">
          <p className="text-gray-300 mb-1">
            {isSingleDayView 
              ? `${payload[0]?.payload?.formattedDate || ''} ${label}`
              : label}
          </p>
          <p className="text-emerald-500 font-medium">
            {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Determine X-axis interval based on date range span
  const xAxisInterval = useMemo(() => {
    if (isSingleDayView) {
      return 3; // Show every 4th hour for single day view
    } else if (dateRangeSpan <= 7) {
      return 0; // Show all days for a week or less
    } else if (dateRangeSpan <= 31) {
      return Math.floor(dateRangeSpan / 7); // Show approximately weekly for a month
    } else {
      return Math.floor(dateRangeSpan / 10); // Show approximately 10 labels for longer periods
    }
  }, [isSingleDayView, dateRangeSpan]);

  // If no data or all zero values, show empty state
  if (chartData.length === 0 || chartData.every(item => item.value === 0)) {
    return (
      <div className="w-full h-[80px] mt-4 flex items-center justify-center text-gray-500 text-xs">
        No data available for this time period
      </div>
    );
  }

  return (
    <div className="w-full h-[80px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={chartData.length < 10}
            activeDot={{ r: 4, fill: color, stroke: '#111' }}
          />
          <XAxis 
            dataKey={isSingleDayView ? "displayHour" : "displayDate"} 
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={{ stroke: '#333' }}
            tickLine={{ stroke: '#333' }}
            interval={xAxisInterval}
            minTickGap={15}
          />
          <YAxis 
            domain={yAxisDomain}
            tick={{ fontSize: 10, fill: '#666' }}
            tickFormatter={formatYAxis}
            width={30}
            axisLine={{ stroke: '#333' }}
            tickLine={{ stroke: '#333' }}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 
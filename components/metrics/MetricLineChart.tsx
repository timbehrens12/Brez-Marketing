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

  // Find the maximum value in the data to set appropriate Y-axis scale
  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 100;
    const max = Math.max(...data.map(item => item.value));
    // Add 20% padding to the max value to ensure the highest point isn't at the very top
    // and ensure we have a reasonable minimum for small values
    return Math.max(100, max * 1.2);
  }, [data]);

  // Process data for the chart
  const chartData = useMemo(() => {
    // For single day view (today/yesterday)
    if (isSingleDayView) {
      const dayLabel = dateRange?.from ? format(dateRange.from, 'MMM dd') : 'Today';
      
      // Create 24 hour buckets (0-23) with zero values
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        displayHour: i % 4 === 0 ? (i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i-12}pm`) : '',
        value: 0,
        formattedDate: dayLabel,
        formattedTime: i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i-12}pm`
      }));

      // Fill in data if we have any
      if (data && data.length > 0) {
        data.forEach(item => {
          try {
            if (!item.date || typeof item.date !== 'string') return;
            
            const date = parseISO(item.date);
            if (isNaN(date.getTime())) return;
            
            const localDate = toZonedTime(date, userTimeZone);
            const hour = localDate.getHours();
            
            if (hour >= 0 && hour < 24) {
              hourlyData[hour].value += item.value;
            }
          } catch (error) {
            console.error('Error processing date:', error);
          }
        });
      }

      return hourlyData;
    } 
    // For multi-day view
    else {
      // Create a map to aggregate values by date
      const dateMap = new Map();
      
      // If we have a date range, create empty entries for each day
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
      
      // Fill in the data if we have any
      if (data && data.length > 0) {
        data.forEach(item => {
          try {
            if (!item.date || typeof item.date !== 'string') return;
            
            const date = parseISO(item.date);
            if (isNaN(date.getTime())) return;
            
            const dateKey = format(date, 'yyyy-MM-dd');
            
            if (dateMap.has(dateKey)) {
              const existing = dateMap.get(dateKey);
              existing.value += item.value;
            } else {
              dateMap.set(dateKey, {
                date: dateKey,
                displayDate: format(date, 'MMM dd'),
                value: item.value,
                rawDate: new Date(date)
              });
            }
          } catch (error) {
            console.error('Error processing date:', error);
          }
        });
      }
      
      // Convert map to array and sort by date
      return Array.from(dateMap.values())
        .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    }
  }, [data, isSingleDayView, userTimeZone, dateRange]);

  // Calculate Y-axis domain based on data
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, maxValue];
    
    const chartMax = Math.max(...chartData.map(item => item.value));
    // Use the larger of the two max values to ensure we capture all data points
    const finalMax = Math.max(chartMax * 1.1, maxValue);
    // Ensure we have a reasonable minimum for small values
    return [0, Math.max(10, Math.ceil(finalMax))];
  }, [chartData, maxValue]);

  // Format value for tooltip and y-axis
  const formatValue = (value: number) => {
    switch (valueFormat) {
      case "percentage":
        return `${valuePrefix}${value.toFixed(1)}${valueSuffix}`;
      case "currency":
        // Remove the $ from valuePrefix if it's already there to avoid double dollar signs
        const prefix = valuePrefix === "$" ? "" : valuePrefix;
        return `${prefix}$${value.toLocaleString('en-US', { 
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
              ? `${payload[0]?.payload?.formattedDate}, ${payload[0]?.payload?.formattedTime || label}`
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
      return 3; // Show every 4 hours for single day view (since we're only displaying every 4 hours)
    } else if (dateRangeSpan <= 7) {
      return 0; // Show all days for a week or less
    } else if (dateRangeSpan <= 31) {
      return Math.floor(dateRangeSpan / 7); // Show approximately weekly for a month
    } else {
      return Math.floor(dateRangeSpan / 10); // Show approximately 10 labels for longer periods
    }
  }, [isSingleDayView, dateRangeSpan]);

  // If no chart data and not a single day view, show empty state
  if (chartData.length === 0 && !isSingleDayView) {
    return (
      <div className="w-full h-[80px] mt-4 flex items-center justify-center text-gray-500 text-xs">
        No data available for this time period
      </div>
    );
  }

  return (
    <div className="w-full h-[120px] mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 5, right: 0, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.3} />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#111' }}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-in-out"
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
            width={35}
            axisLine={{ stroke: '#333' }}
            tickLine={{ stroke: '#333' }}
            allowDecimals={false}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: '#444', strokeWidth: 1, strokeDasharray: '3 3' }}
            animationDuration={200}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 
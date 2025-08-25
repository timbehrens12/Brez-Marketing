"use client"

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { format, parseISO, isToday, isYesterday, isSameDay, differenceInDays } from 'date-fns'
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
  height?: number
}

export function MetricLineChart({ 
  data, 
  dateRange, 
  valuePrefix = "", 
  valueSuffix = "",
  valueFormat = "number",
  color = "#4ade80",
  height = 140
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
    if (!data || data.length === 0) return 10;
    const max = Math.max(...data.map(item => item.value));
    
    // Calculate a more appropriate maximum based on actual data values
    // For small numbers (1-10), add a little padding but keep scale appropriate
    if (max <= 10) {
      return Math.ceil(max * 1.5);
    }
    // For larger numbers, add 20% padding 
    return Math.ceil(max * 1.2);
  }, [data]);

  // Process data for the chart
  const chartData = useMemo(() => {
    // For single day view (today/yesterday)
    if (isSingleDayView) {
      const dayLabel = dateRange?.from ? format(dateRange.from, 'MMM dd') : 'Today';
      
      // Check if the data already has hourly information
      const hasHourlyFormat = data.length > 0 && 'hour' in data[0] && 'displayHour' in data[0];
      
      if (hasHourlyFormat) {
        // Data is already in the correct hourly format
        return data;
      }
      
      // Create 24 hour buckets (0-23) with zero values
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        displayHour: i % 2 === 0 ? (i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i-12}pm`) : '',
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
            
            // Parse the UTC timestamp and get local hour
            // The database stores timestamps with timezone (+00), so parse as-is
            const timestamp = new Date(item.date);
            const hour = timestamp.getHours();
            
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
          // Revert to always using 'MMM dd'
          dateMap.set(dateKey, {
            date: dateKey,
            displayDate: format(currentDate, 'MMM dd'), // Always use 'MMM dd'
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
              // Revert to always using 'MMM dd' here too
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
    if (chartData.length === 0) return [0, 10];
    
    const chartMax = Math.max(...chartData.map(item => item.value));
    
    // If all values are 0, use a small scale (0-5)
    if (chartMax === 0) return [0, 5];
    
    // For very small values (1-5), use a proportional scale
    if (chartMax <= 5) return [0, Math.ceil(chartMax * 1.5)];
    
    // For slightly larger values (6-20), keep scale tight
    if (chartMax <= 20) return [0, Math.ceil(chartMax * 1.2)];
    
    // For medium values, add more padding
    const finalMax = Math.ceil(chartMax * 1.1);
    
    // Calculate a reasonable tick interval
    // This helps ensure the Y-axis has sensible tick marks
    let roundToNearest;
    if (finalMax <= 50) roundToNearest = 5;
    else if (finalMax <= 100) roundToNearest = 10;
    else if (finalMax <= 500) roundToNearest = 50;
    else if (finalMax <= 1000) roundToNearest = 100;
    else if (finalMax <= 5000) roundToNearest = 500;
    else roundToNearest = 1000;
    
    return [0, Math.ceil(finalMax / roundToNearest) * roundToNearest];
  }, [chartData]);

  // Format value for tooltip and y-axis
  const formatValue = (value: number) => {
    // Add defensive check
    if (value === undefined || value === null || isNaN(value)) {
      return valueFormat === "currency" ? `$0` : valueFormat === "percentage" ? "0%" : "0";
    }
    
    try {
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
    } catch (error) {
      console.error("Error formatting value:", error);
      return valueFormat === "currency" ? `$0` : valueFormat === "percentage" ? "0%" : "0";
    }
  };

  // Format for Y-axis ticks
  const formatYAxis = (value: number) => {
    // Add defensive check
    if (value === undefined || value === null || isNaN(value)) {
      return valueFormat === "currency" ? `$0` : valueFormat === "percentage" ? "0%" : "0";
    }
    
    try {
      if (valueFormat === "currency") {
        if (value >= 1000000) {
          return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `$${(value / 1000).toFixed(0)}K`;
        } else {
          return `$${value.toLocaleString()}`;
        }
      } else if (valueFormat === "percentage") {
        return `${value}%`;
      } else {
        if (value >= 1000000) {
          return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `${(value / 1000).toFixed(0)}K`;
        }
        return value.toLocaleString();
      }
    } catch (error) {
      console.error("Error formatting Y-axis:", error);
      return valueFormat === "currency" ? `$0` : valueFormat === "percentage" ? "0%" : "0";
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    try {
      if (active && payload && payload.length && payload[0] && payload[0].payload) {
        const value = payload[0].value;
        
        // Ensure value is a number
        const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
        
        return (
          <div className="bg-[#1a1a1a] border border-[#333] rounded p-2 text-xs shadow-lg">
            <p className="text-gray-300 mb-1">
              {isSingleDayView && payload[0].payload 
                ? `${payload[0].payload.formattedDate || ''}, ${payload[0].payload.formattedTime || label || ''}`
                : label || ''}
            </p>
            <p className="text-emerald-500 font-medium">
              {formatValue(safeValue)}
            </p>
          </div>
        );
      }
      return null;
    } catch (error) {
      console.error("Error rendering tooltip:", error);
      return null;
    }
  };

  // Determine X-axis interval based on date range span - MORE AGGRESSIVE LOGIC
  const xAxisInterval = useMemo(() => {
    if (isSingleDayView) {
      return 1;
    } else if (dateRangeSpan <= 15) { // Show daily ticks up to 15 days
      return 0; 
    } else if (dateRangeSpan <= 30) { // Show every 2 days up to 30 days
      return 1; 
    } else if (dateRangeSpan <= 60) { // Show every 3 days up to 60 days
      return 2; 
    } else if (dateRangeSpan <= 90) { // Show every 5 days up to 90 days
      return 4; 
    } else { // For ranges > 90 days
      // Aim for ~15 ticks total by dividing span by 15
      return Math.max(0, Math.floor(dateRangeSpan / 15)); // Ensure interval is at least 0
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
    <div className="w-full mt-2" style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={chartData} 
          margin={{ top: 5, right: 5, bottom: 0, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} opacity={0.3} />
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            fill="url(#colorValue)"
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#111' }}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-in-out"
          />
          <XAxis 
            dataKey={isSingleDayView ? "displayHour" : "displayDate"} 
            tick={{ fontSize: 10, fill: '#666' }}
            angle={-45}
            textAnchor="end"
            axisLine={{ stroke: '#333' }}
            tickLine={{ stroke: '#333' }}
            interval={xAxisInterval}
            minTickGap={5}
            height={40}
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
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
} 
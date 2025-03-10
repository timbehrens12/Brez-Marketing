"use client"

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { format, parseISO, isToday, isYesterday, isSameDay } from 'date-fns'
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

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // For single day view, group by hour
    if (isSingleDayView) {
      // Create 24 hour buckets (0-23)
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        displayHour: i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i-12}pm`,
        value: 0
      }));

      // Fill in the data
      data.forEach(item => {
        try {
          const date = parseISO(item.date);
          const localDate = toZonedTime(date, userTimeZone);
          const hour = localDate.getHours();
          
          // Add to the appropriate hour bucket
          hourlyData[hour].value += item.value;
        } catch (error) {
          console.error('Error processing date for hourly chart:', error);
        }
      });

      return hourlyData;
    } 
    // For multi-day view, use daily data
    else {
      return data.map(item => {
        try {
          const date = parseISO(item.date);
          return {
            date: item.date,
            displayDate: format(date, 'MMM dd'),
            value: item.value
          };
        } catch (error) {
          console.error('Error processing date for daily chart:', error);
          return { date: item.date, displayDate: 'Invalid', value: item.value };
        }
      });
    }
  }, [data, isSingleDayView, userTimeZone]);

  // Format value for tooltip
  const formatValue = (value: number) => {
    switch (valueFormat) {
      case "percentage":
        return `${valuePrefix}${value.toFixed(2)}${valueSuffix}`;
      case "currency":
        return `${valuePrefix}$${value.toLocaleString('en-US', { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 0 
        })}${valueSuffix}`;
      default:
        return `${valuePrefix}${value.toLocaleString()}${valueSuffix}`;
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a1a] border border-[#333] rounded p-2 text-xs shadow-lg">
          <p className="text-gray-300 mb-1">
            {isSingleDayView ? label : format(parseISO(label), 'MMM dd, yyyy')}
          </p>
          <p className="text-emerald-500 font-medium">
            {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[80px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
        >
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: '#111' }}
          />
          <XAxis 
            dataKey={isSingleDayView ? "displayHour" : "displayDate"} 
            tick={{ fontSize: 10, fill: '#666' }}
            axisLine={{ stroke: '#333' }}
            tickLine={{ stroke: '#333' }}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: '#333', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 
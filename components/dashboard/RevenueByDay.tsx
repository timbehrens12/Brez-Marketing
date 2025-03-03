"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useMemo, useState, useEffect, useRef } from 'react'
import { 
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  subDays,
  isValid,
  parse,
  setHours,
  getDaysInMonth,
  getMonth,
  getYear,
  getWeek,
  getWeeksInMonth,
  eachWeekOfInterval,
  getHours,
  getDate,
  getDay,
  endOfDay,
  subYears,
  addYears,
  subWeeks,
  subMonths
} from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface RevenueByDayProps {
  data?: Array<{
    date: string;
    revenue: number;
    isTimezoneShifted?: boolean;
    forceShowOnFirst?: boolean;
    id?: string;
  }>;
  brandId: string;
}

export function RevenueByDay({ data: initialData, brandId }: RevenueByDayProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('weekly');
  const [salesData, setSalesData] = useState<Array<{
    date: string; 
    revenue: number; 
    isTimezoneShifted?: boolean;
    forceShowOnFirst?: boolean;
    id?: string;
  }>>(initialData || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track displayed sale IDs across renders
  const displayedSaleIdsRef = useRef(new Set<string>());
  
  // Track component subscription status to prevent state updates after unmount
  const isSubscribedRef = useRef(true);
  
  // Set up subscription tracking
  useEffect(() => {
    isSubscribedRef.current = true;
    return () => {
      isSubscribedRef.current = false;
    };
  }, []);
  
  // Helper function to fetch from API
  const fetchFromAPI = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    return await response.json();
  };
  
  // Helper function to check if an error is related to database updates
  const isDatabaseUpdateError = (errorMessage: string): boolean => {
    return errorMessage.includes('Database update in progress') || 
           errorMessage.includes('Database schema has changed') || 
           errorMessage.includes('database schema') || 
           errorMessage.includes('does not exist');
  };
  
  // Clear the displayed sales IDs when the sales data changes
  useEffect(() => {
    displayedSaleIdsRef.current.clear();
  }, [salesData]);
  
  // Log initial data on mount
  useEffect(() => {
    console.log('Revenue Calendar: Component mounted with initial data:', {
      initialDataProvided: !!initialData,
      initialDataLength: initialData?.length || 0,
      initialDataSample: initialData?.slice(0, 3) || [],
      brandId
    });
    
    // Check if initial data is valid
    if (initialData) {
      const isValid = Array.isArray(initialData) && initialData.every(item => 
        item && typeof item === 'object' && 'date' in item && 'revenue' in item
      );
      
      console.log('Revenue Calendar: Initial data is valid:', isValid);
      
      if (!isValid) {
        console.error('Revenue Calendar: Invalid initial data format:', initialData);
      } else if (initialData.length > 0) {
        // If we have valid initial data, use it right away
        console.log('Revenue Calendar: Using initial data on mount');
        setSalesData(initialData);
      }
    }
  }, [initialData, brandId]);
  
  // Define fetchSalesData outside of useEffect so it can be called from the retry button
  const fetchSalesData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // IMPORTANT: Always use a very wide date range to ensure we get ALL sales data
      // regardless of what date range is selected in the date picker
      // This ensures the revenue calendar always shows all data
      const endDate = new Date(new Date().getFullYear() + 2, 0, 1).toISOString().split('T')[0]; // 2 years in the future
      const startDate = new Date(new Date().getFullYear() - 5, 0, 1).toISOString().split('T')[0]; // 5 years ago
      
      console.log('Revenue Calendar: Fetching ALL sales data', { startDate, endDate, brandId });
      
      // CRITICAL: We're using a direct fetch here instead of going through any context or state
      // that might be affected by the date range picker
      const response = await fetch(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Revenue Calendar: API error (${response.status}):`, errorText);
        
        // Check if this is a database schema error
        if (errorText.includes('relation "public.shopify_data" does not exist') || 
            errorText.includes('Database schema has changed')) {
          console.log('Revenue Calendar: Database schema error detected');
          
          // If we have initial data, use it and don't show an error
          if (initialData && initialData.length > 0) {
            console.log('Revenue Calendar: Using initial data for database schema error');
            setSalesData(initialData);
            setError(null);
          } else {
            // No data available, set empty array but ensure today and yesterday are shown
            const emptyData = createEmptyDataWithTodayAndYesterday();
            setSalesData(emptyData);
            setError('Database update in progress.');
          }
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorText);
      }
      
      const result = await response.json();
      
      if (!result.sales) {
        console.error('Revenue Calendar: No sales array in response', result);
        // Ensure today and yesterday are shown even with no data
        const emptyData = createEmptyDataWithTodayAndYesterday();
        setSalesData(emptyData);
        setError('No sales data available.');
        setIsLoading(false);
        return;
      }
      
      if (result.sales.length === 0) {
        console.warn('Revenue Calendar: Empty sales array returned');
        
        // Check if this is a database schema error
        if (result.message && result.message.includes('Database schema has changed')) {
          console.log('Revenue Calendar: Database schema error detected in message');
          
          // If we have initial data, use it and don't show an error
          if (initialData && initialData.length > 0) {
            console.log('Revenue Calendar: Using initial data for database schema error');
            setSalesData(initialData);
            setError(null);
          } else {
            // No data available, set empty array but ensure today and yesterday are shown
            const emptyData = createEmptyDataWithTodayAndYesterday();
            setSalesData(emptyData);
            setError('Database update in progress.');
          }
          setIsLoading(false);
          return;
        }
        
        // Ensure today and yesterday are shown even with no data
        const emptyData = createEmptyDataWithTodayAndYesterday();
        setSalesData(emptyData);
        setError('No sales data available.');
        setIsLoading(false);
        return;
      }
      
      // Transform the sales data
      const transformedData = result.sales.map((sale: any) => {
        const rawDate = sale.created_at;
        const saleAmount = parseFloat(sale.total_price || '0');
        
        return {
          date: rawDate,
          revenue: saleAmount,
          id: sale.id
        };
      });
      
      // CRITICAL: Ensure today and yesterday are included in the data
      // This ensures the calendar always shows today and yesterday even if there are no sales
      const enhancedData = ensureTodayAndYesterdayInData(transformedData);
      
      console.log('Revenue Calendar: Fetch successful, updating data');
      setSalesData(enhancedData);
      setError(null);
      
    } catch (error) {
      console.error('Revenue Calendar: Error fetching sales data:', error);
      
      // If we have initial data, use it and don't show an error
      if (initialData && initialData.length > 0) {
        console.log('Revenue Calendar: Using initial data after fetch error');
        setSalesData(initialData);
        setError(null);
      } else {
        // No data available, set empty array but ensure today and yesterday are shown
        const emptyData = createEmptyDataWithTodayAndYesterday();
        setSalesData(emptyData);
        setError('Error loading sales data.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Ensure today and yesterday are in the initial data
  const ensureTodayAndYesterdayInData = (data: Array<{date: string; revenue: number; id?: string}>) => {
    if (!Array.isArray(data)) {
      console.error('ensureTodayAndYesterdayInData: data is not an array', data);
      return [];
    }
    
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    const todayFormatted = format(today, 'yyyy-MM-dd');
    const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
    
    console.log('Revenue Calendar: Checking for today and yesterday in data', {
      todayFormatted,
      yesterdayFormatted,
      dataLength: data.length,
      sampleDates: data.slice(0, 3).map(s => s.date)
    });
    
    // Check if today and yesterday are in the data
    const hasTodaySale = data.some(sale => {
      if (!sale || !sale.date) return false;
      try {
        const saleDate = parseISO(sale.date);
        return format(saleDate, 'yyyy-MM-dd') === todayFormatted;
      } catch (error) {
        return false;
      }
    });
    
    const hasYesterdaySale = data.some(sale => {
      if (!sale || !sale.date) return false;
      try {
        const saleDate = parseISO(sale.date);
        return format(saleDate, 'yyyy-MM-dd') === yesterdayFormatted;
      } catch (error) {
        return false;
      }
    });
    
    console.log('Revenue Calendar: Today and yesterday check results', {
      hasTodaySale,
      hasYesterdaySale
    });
    
    // Create a copy of the data
    const enhancedData = [...data];
    
    // Add today if not present
    if (!hasTodaySale) {
      enhancedData.push({
        date: `${todayFormatted}T00:00:00.000Z`,
        revenue: 0,
        id: `generated-today-${Math.random()}`
      });
    }
    
    // Add yesterday if not present
    if (!hasYesterdaySale) {
      enhancedData.push({
        date: `${yesterdayFormatted}T00:00:00.000Z`,
        revenue: 0,
        id: `generated-yesterday-${Math.random()}`
      });
    }
    
    return enhancedData;
  };
  
  // Helper function to create empty data with today and yesterday
  const createEmptyDataWithTodayAndYesterday = () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    
    const todayFormatted = format(today, 'yyyy-MM-dd');
    const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
    
    return [
      {
        date: `${todayFormatted}T00:00:00.000Z`,
        revenue: 0,
        id: `generated-today-${Math.random()}`
      },
      {
        date: `${yesterdayFormatted}T00:00:00.000Z`,
        revenue: 0,
        id: `generated-yesterday-${Math.random()}`
      }
    ];
  };
  
  // Fetch data on mount
  useEffect(() => {
    console.log('Revenue Calendar: Component mounted, fetching data immediately');
    
    // If we have initial data, use it first
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      console.log('Revenue Calendar: Using initial data first', initialData.length, 'records');
      const enhancedInitialData = ensureTodayAndYesterdayInData(initialData);
      setSalesData(enhancedInitialData);
    }
    
    // Then fetch fresh data
    fetchSalesData();
    
    // Set up interval for background refresh
    const intervalId = setInterval(() => {
      if (isSubscribedRef.current) {
        console.log('Revenue Calendar: Background refresh triggered');
        quietFetch();
      }
    }, 60000); // Refresh every minute
    
    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
      isSubscribedRef.current = false;
    };
  }, [brandId]); // Only re-run if brandId changes
  
  // Prevent any other useEffects from triggering refreshes based on other props
  
  // Debug log for component state
  useEffect(() => {
    console.log('Revenue Calendar: Component state updated:', {
      brandId,
      initialDataLength: initialData?.length || 0,
      salesDataLength: Array.isArray(salesData) ? salesData.length : 0,
      isUsingInitialData: initialData && Array.isArray(initialData) && Array.isArray(salesData) && salesData === initialData,
      timeFrame,
      isLoading,
      error,
      hasError: !!error
    });
  }, [brandId, initialData, salesData, timeFrame, isLoading, error]);

  // Modify the quiet fetch to prevent overwriting valid data
  const quietFetch = async () => {
    if (!isSubscribedRef.current) return;
    
    try {
      console.log('Revenue Calendar: Performing quiet background fetch');
      
      // Use a wider date range for the quiet fetch to ensure we get all data
      const startDate = format(subYears(new Date(), 5), 'yyyy-MM-dd');
      const endDate = format(addYears(new Date(), 2), 'yyyy-MM-dd');
      
      // Fix: Use the correct API endpoint that matches the one in fetchSalesData
      // CRITICAL: We're using a direct fetch here instead of going through any context or state
      // that might be affected by the date range picker
      const result = await fetchFromAPI(`/api/shopify/sales?brandId=${brandId}&startDate=${startDate}&endDate=${endDate}`);
      
      console.log('Revenue Calendar: Background fetch result:', {
        hasResult: !!result,
        hasSales: result && !!result.sales,
        salesCount: result && result.sales ? result.sales.length : 0
      });
      
      if (!result || !result.sales || !Array.isArray(result.sales)) {
        console.log('Revenue Calendar: No sales data in background fetch, keeping existing data');
        return;
      }
      
      // Transform the sales data
      const transformedData = result.sales.map((sale: any) => {
        const rawDate = sale.created_at;
        const saleAmount = parseFloat(sale.total_price || '0');
        
        return {
          date: rawDate,
          revenue: saleAmount,
          id: sale.id || `generated-${rawDate}-${Math.random()}`
        };
      });
      
      // CRITICAL: If we're in daily mode, we need to merge the new data with existing data
      // This ensures we don't lose days with sales when refreshing
      if (timeFrame === 'daily' && Array.isArray(salesData) && salesData.length > 0) {
        console.log('Revenue Calendar: In daily mode, merging new data with existing data to preserve all days with sales');
        
        // Create a map of existing sales by date
        const existingSalesByDate = new Map<string, Array<{date: string; revenue: number; id: string}>>();
        salesData.forEach((sale: {date: string; revenue: number; id?: string}) => {
          if (!sale || !sale.date) return;
          
          try {
            const saleDate = parseISO(sale.date);
            const formattedDate = format(saleDate, 'yyyy-MM-dd');
            
            // Skip empty sales (revenue = 0) for today and yesterday
            // These were likely added by our helper functions
            const isToday = format(new Date(), 'yyyy-MM-dd') === formattedDate;
            const isYesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd') === formattedDate;
            
            if ((isToday || isYesterday) && sale.revenue === 0) {
              return;
            }
            
            // Store by date for easy lookup
            if (!existingSalesByDate.has(formattedDate)) {
              existingSalesByDate.set(formattedDate, []);
            }
            existingSalesByDate.get(formattedDate)?.push({
              date: sale.date,
              revenue: sale.revenue,
              id: sale.id || `generated-${sale.date}-${Math.random()}`
            });
          } catch (error) {
            console.error('Error processing existing sale date:', sale.date, error);
          }
        });
        
        // Create a map of new sales by date
        const newSalesByDate = new Map<string, Array<{date: string; revenue: number; id: string}>>();
        transformedData.forEach((sale: {date: string; revenue: number; id: string}) => {
          if (!sale || !sale.date) return;
          
          try {
            const saleDate = parseISO(sale.date);
            const formattedDate = format(saleDate, 'yyyy-MM-dd');
            
            // Store by date for easy lookup
            if (!newSalesByDate.has(formattedDate)) {
              newSalesByDate.set(formattedDate, []);
            }
            newSalesByDate.get(formattedDate)?.push(sale);
          } catch (error) {
            console.error('Error processing new sale date:', sale.date, error);
          }
        });
        
        // Merge the data, preferring new data for dates that exist in both
        const mergedData: Array<{date: string; revenue: number; id: string}> = [];
        
        // Add all new sales
        transformedData.forEach((sale: {date: string; revenue: number; id: string}) => mergedData.push(sale));
        
        // Add existing sales for dates not in new data
        existingSalesByDate.forEach((sales, date) => {
          if (!newSalesByDate.has(date)) {
            sales.forEach(sale => mergedData.push(sale));
          }
        });
        
        // Ensure today and yesterday are included
        const enhancedData = ensureTodayAndYesterdayInData(mergedData);
        
        // Update the state with the merged data
        console.log('Revenue Calendar: Setting merged data with', enhancedData.length, 'records');
        setSalesData(enhancedData);
        return;
      }
      
      // For other time frames, just use the new data
      // But ensure today and yesterday are included
      const enhancedData = ensureTodayAndYesterdayInData(transformedData);
      console.log('Revenue Calendar: Setting new data with', enhancedData.length, 'records');
      setSalesData(enhancedData);
    } catch (error) {
      console.error('Revenue Calendar: Background fetch exception', error);
      console.log('Revenue Calendar: Background fetch exception, keeping existing data');
    }
  };

  // Get hours of the day (12am to 11pm)
  const hoursOfDay = useMemo(() => {
    const today = new Date()
    // Set to start of today
    const startOfToday = startOfDay(today)
    
    return Array.from({ length: 24 }, (_, i) => {
      const hour = setHours(startOfToday, i)
      return {
        date: hour,
        dayName: format(hour, "ha").toLowerCase(), // Format as 12am, 1am, etc.
        dayNumber: i.toString(),
        formattedDate: format(hour, "yyyy-MM-dd HH:00")
      }
    })
  }, [])
  
  // Generate days to display based on timeFrame
  const daysToDisplay = useMemo(() => {
    const now = new Date();
    let days = [];
    
    console.log('Revenue Calendar: Generating days to display for timeFrame:', timeFrame);
    
    // Generate days based on timeFrame
    if (timeFrame === 'daily') {
      // For daily view, show the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        days.push({
          date,
          dayName: format(date, 'EEE'),
          dayNumber: format(date, 'd'),
          formattedDate: format(date, 'yyyy-MM-dd'),
          isToday: i === 0
        });
      }
    } else if (timeFrame === 'weekly') {
      // For weekly view, show the last 7 weeks
      for (let i = 6; i >= 0; i--) {
        const date = subWeeks(now, i);
        days.push({
          date,
          dayName: `Week ${format(date, 'w')}`,
          dayNumber: format(date, 'MMM d'),
          formattedDate: format(date, 'yyyy-MM-dd'),
          isToday: i === 0
        });
      }
    } else if (timeFrame === 'monthly') {
      // For monthly view, show the last 7 months
      for (let i = 6; i >= 0; i--) {
        const date = subMonths(now, i);
        days.push({
          date,
          dayName: format(date, 'MMM'),
          dayNumber: format(date, 'yyyy'),
          formattedDate: format(date, 'yyyy-MM-dd'),
          isToday: i === 0
        });
      }
    } else if (timeFrame === 'yearly') {
      // For yearly view, show the last 7 years
      for (let i = 6; i >= 0; i--) {
        const date = subYears(now, i);
        days.push({
          date,
          dayName: format(date, 'yyyy'),
          dayNumber: '',
          formattedDate: format(date, 'yyyy-MM-dd'),
          isToday: i === 0
        });
      }
    }

    // CRITICAL: For 'daily' timeFrame, we want to show ALL days with data
    // This ensures that when viewing "today" or "yesterday", we still see all days with sales
    if (timeFrame === 'daily' && Array.isArray(salesData) && salesData.length > 0) {
      console.log('Revenue Calendar: Adding all days with sales data to display');
      
      // Create a map of days we already have
      const existingDays = new Map();
      days.forEach(day => {
        existingDays.set(format(day.date, 'yyyy-MM-dd'), true);
      });
      
      // Add all days with sales data
      salesData.forEach(sale => {
        if (!sale || !sale.date) return;
        
        try {
          const saleDate = parseISO(sale.date);
          const formattedDate = format(saleDate, 'yyyy-MM-dd');
          
          // Skip if we already have this day
          if (existingDays.has(formattedDate)) return;
          
          // Add this day
          days.push({
            date: saleDate,
            dayName: format(saleDate, 'EEE'),
            dayNumber: format(saleDate, 'd'),
            formattedDate: formattedDate,
            isToday: isSameDay(saleDate, now)
          });
          
          // Mark as added
          existingDays.set(formattedDate, true);
        } catch (error) {
          console.error('Error processing sale date for display:', sale.date, error);
        }
      });
      
      // Sort days by date
      days.sort((a, b) => {
        return a.date.getTime() - b.date.getTime();
      });
    }

    // CRITICAL: Always ensure today and yesterday are included
    // This is important for when the user selects "Today" or "Yesterday"
    const todayFormatted = format(now, 'yyyy-MM-dd');
    const yesterdayFormatted = format(subDays(now, 1), 'yyyy-MM-dd');
    
    // Check if today is already included
    const hasToday = days.some(day => format(day.date, 'yyyy-MM-dd') === todayFormatted);
    if (!hasToday) {
      days.push({
        date: now,
        dayName: format(now, 'EEE'),
        dayNumber: format(now, 'd'),
        formattedDate: todayFormatted,
        isToday: true
      });
    }
    
    // Check if yesterday is already included
    const yesterday = subDays(now, 1);
    const hasYesterday = days.some(day => format(day.date, 'yyyy-MM-dd') === yesterdayFormatted);
    if (!hasYesterday) {
      days.push({
        date: yesterday,
        dayName: format(yesterday, 'EEE'),
        dayNumber: format(yesterday, 'd'),
        formattedDate: yesterdayFormatted,
        isToday: false
      });
    }
    
    // Sort days by date again if we added today or yesterday
    if (!hasToday || !hasYesterday) {
      days.sort((a, b) => {
        return a.date.getTime() - b.date.getTime();
      });
    }
    
    console.log('Revenue Calendar: Generated', days.length, 'days to display');
    return days;
  }, [timeFrame, salesData]);

  // Transform the sales data into display data
  const displayData = useMemo(() => {
    if (!salesData || !Array.isArray(salesData) || salesData.length === 0 || !daysToDisplay || !Array.isArray(daysToDisplay)) {
      return [];
    }
    
    console.log('Revenue Calendar: Transforming sales data to display data', {
      salesDataLength: salesData.length,
      daysToDisplayLength: daysToDisplay.length,
      timeFrame
    });
    
    // Map of date to revenue
    const revenueByDate = new Map<string, number>();
    
    // Process each sale
    salesData.forEach(sale => {
      if (!sale || !sale.date) return;
      
      try {
        // Parse the sale date
        const saleDate = parseISO(sale.date);
        
        // Format the date based on timeFrame
        let formattedSaleDate;
        if (timeFrame === 'yearly') {
          formattedSaleDate = format(saleDate, 'yyyy-MM');
        } else {
          formattedSaleDate = format(saleDate, 'yyyy-MM-dd');
        }
        
        // Add to the revenue for this date
        const currentRevenue = revenueByDate.get(formattedSaleDate) || 0;
        revenueByDate.set(formattedSaleDate, currentRevenue + (sale.revenue || 0));
      } catch (error) {
        console.error('Error processing sale date:', sale.date, error);
      }
    });
    
    // Debug log for today and yesterday
    const today = new Date();
    const yesterday = subDays(today, 1);
    const todayFormatted = format(today, 'yyyy-MM-dd');
    const yesterdayFormatted = format(yesterday, 'yyyy-MM-dd');
    
    console.log('Revenue Calendar: Today and yesterday revenue', {
      todayRevenue: revenueByDate.get(todayFormatted) || 0,
      yesterdayRevenue: revenueByDate.get(yesterdayFormatted) || 0
    });
    
    // Map days to their revenue
    return daysToDisplay.map(day => {
      // Format the day date based on timeFrame
      const formattedDayDate = timeFrame === 'yearly' 
        ? format(day.date, 'yyyy-MM')
        : format(day.date, 'yyyy-MM-dd');
      
      // Get revenue for this day (default to 0 if no sales)
      const dayRevenue = revenueByDate.get(formattedDayDate) || 0;
      
      return {
        ...day,
        revenue: dayRevenue
      };
    });
  }, [salesData, daysToDisplay, timeFrame]);

  // Find the maximum revenue for scaling
  const maxRevenue = useMemo(() => {
    if (!displayData || !Array.isArray(displayData) || displayData.length === 0) {
      return 1; // Default value if displayData is invalid
    }
    const revenues = displayData.map(day => day?.revenue || 0);
    return Math.max(...revenues, 1); // Ensure we don't divide by zero
  }, [displayData]);

  // Calculate total revenue for the current timeframe
  const totalRevenue = useMemo(() => {
    if (!displayData || !Array.isArray(displayData)) {
      return 0;
    }
    return displayData.reduce((sum, day) => sum + (day?.revenue || 0), 0);
  }, [displayData]);

  // Format the total revenue for display
  const formattedTotalRevenue = useMemo(() => {
    if (totalRevenue >= 1000000) {
      return `$${(totalRevenue / 1000000).toFixed(2)}M`;
    } else if (totalRevenue >= 1000) {
      return `$${(totalRevenue / 1000).toFixed(2)}K`;
    } else {
      return `$${totalRevenue.toFixed(2)}`;
    }
  }, [totalRevenue]);

  // Get the title based on the selected time frame
  const getTitle = () => {
    switch (timeFrame) {
      case 'daily':
        // If we're in daily mode but showing all days with data, make that clear
        return 'All Days with Sales';
      case 'weekly':
        return 'Last 7 Days';
      case 'monthly':
        return `${format(new Date(), 'MMMM yyyy')}`;
      case 'yearly':
        return `${format(new Date(), 'yyyy')} by Month`;
      default:
        return 'Revenue Calendar';
    }
  }

  return (
    <div className="h-full">
      {error && (
        <div className="text-sm text-gray-400 mb-4">
          {timeFrame === 'daily' && displayData && displayData.length > 2 ? (
            // If we're showing all days with data, make the error less prominent
            <span className="text-xs text-gray-300">
              {error} (Showing all days with sales)
            </span>
          ) : (
            // Regular error display
            error
          )}
        </div>
      )}
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-[200px] bg-gray-800 rounded"></div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{getTitle()}</h3>
            <div className="flex gap-2">
              <Select value={timeFrame} onValueChange={(value: TimeFrame) => setTimeFrame(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Restore the previous layout with a more compact design */}
          <div className="grid grid-cols-7 gap-1">
            {daysToDisplay.map((day, index) => {
              const dayData = displayData.find(d => d.formattedDate === day.formattedDate) || {
                ...day,
                revenue: 0
              };

              // Calculate the height percentage based on revenue
              const heightPercentage = dayData.revenue > 0 
                ? Math.max(5, Math.min(100, (dayData.revenue / maxRevenue) * 100)) 
                : 2;

              return (
                <div
                  key={day.formattedDate}
                  className={cn(
                    "flex flex-col items-center p-1 rounded border border-gray-800",
                    day.isToday && "bg-blue-950 border-blue-800"
                  )}
                >
                  <div className="text-xs text-gray-400">
                    {timeFrame !== 'yearly' && day.dayName}
                  </div>
                  <div className="text-sm font-medium">
                    {timeFrame !== 'yearly' && day.dayNumber}
                  </div>
                  <div className="w-full mt-1">
                    <div className="relative h-16">
                      <div
                        className={cn(
                          "absolute bottom-0 w-full rounded-t",
                          dayData.revenue > 0 ? "bg-blue-500" : "bg-gray-700"
                        )}
                        style={{
                          height: `${heightPercentage}%`
                        }}
                        title={`$${dayData.revenue.toFixed(2)}`}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 text-center">
                      ${dayData.revenue > 999 
                        ? (dayData.revenue/1000).toFixed(1) + 'k' 
                        : dayData.revenue.toFixed(0)}
                    </div>
                    {timeFrame === 'yearly' && (
                      <div className="text-xs text-gray-400 mt-1">{day.dayName}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  )
}
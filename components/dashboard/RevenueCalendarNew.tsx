"use client"

import { useState, useEffect, useRef } from "react"
import { 
  format, 
  parseISO, 
  subDays, 
  isSameDay, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  getDay,
  addMonths,
  subMonths
} from "date-fns"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"

type TimeFrame = 'today' | 'weekly' | 'monthly' | 'yearly'

interface RevenueCalendarProps {
  brandId: string;
  isRefreshing?: boolean;
}

interface SalesData {
  date: string;
  revenue: number;
  id?: string;
}

interface DisplayItem {
  date: string;
  displayDate: string;
  revenue: number;
  count: number;
  isToday?: boolean;
  isCurrentMonth?: boolean;
}

export function RevenueCalendarNew({ brandId, isRefreshing = false }: RevenueCalendarProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('monthly');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Track component subscription status
  const isSubscribedRef = useRef(true);
  
  useEffect(() => {
    isSubscribedRef.current = true;
    return () => {
      isSubscribedRef.current = false;
    };
  }, []);

  // Fetch data from Supabase
  const fetchSalesData = async () => {
    if (!isSubscribedRef.current) return;
    setIsLoading(true);
    
    try {
      console.log('Revenue Calendar: Fetching sales data for brand:', brandId);
      
      // Get the date range based on the selected time frame
      const today = new Date();
      let startDate: Date;
      
      if (timeFrame === 'today') {
        startDate = today;
      } else if (timeFrame === 'weekly') {
        startDate = startOfWeek(today, { weekStartsOn: 1 }); // Start on Monday
      } else if (timeFrame === 'monthly') {
        startDate = startOfMonth(today);
      } else {
        // Yearly view - get the whole year
        startDate = new Date(today.getFullYear(), 0, 1);
      }
      
      const { data, error } = await supabase
        .from('shopify_orders')
        .select('id, created_at, total_price')
        .eq('brand_id', brandId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching sales data:', error);
        setError('Failed to load sales data. Please try again later.');
        setIsLoading(false);
        return;
      }
      
      // Process the data
      const processedData = data.map((order: any) => ({
        date: order.created_at,
        revenue: parseFloat(order.total_price),
        id: order.id
      }));
      
      setSalesData(processedData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error in fetchSalesData:', err);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch data on component mount and when brandId or timeFrame changes
  useEffect(() => {
    fetchSalesData();
  }, [brandId, timeFrame]);
  
  // Handle time frame change
  const handleTimeFrameChange = (value: TimeFrame) => {
    setTimeFrame(value);
  };
  
  // Generate display data based on the selected time frame
  const generateDisplayData = (): DisplayItem[] => {
    const today = new Date();
    
    if (timeFrame === 'monthly') {
      // Monthly view - days of the current month
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayOrders = salesData.filter(sale => 
          sale.date.startsWith(dayStr)
        );
        
        const revenue = dayOrders.reduce((sum, order) => sum + order.revenue, 0);
        
        return {
          date: dayStr,
          displayDate: format(day, 'd'),
          revenue,
          count: dayOrders.length,
          isToday: isSameDay(day, today)
        };
      });
    } else {
      return [];
    }
  };
  
  const displayData = generateDisplayData();
  
  // Get the title based on the selected time frame
  const getTitle = () => {
    const currentDate = new Date();
    return format(currentDate, 'MMMM yyyy');
  };
  
  // Render revenue value with loading state
  const renderRevenueValue = (revenue: number) => {
    if (isRefreshing) {
      return (
        <div style={{
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          backgroundColor: '#333333 !important',
          height: '16px',
          width: '48px',
          borderRadius: '4px',
          margin: '0 auto'
        }}></div>
      );
    }
    
    return revenue > 0 
      ? (revenue >= 1000 
          ? `$${(revenue / 1000).toFixed(1)}k` 
          : `$${revenue.toFixed(0)}`)
      : "-";
  };
  
  // Monthly view - calendar grid
  const renderMonthlyCalendar = () => {
    const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const firstDayOfMonth = startOfMonth(today);
    const startDayOfWeek = getDay(firstDayOfMonth) || 7; // Convert Sunday (0) to 7 for easier calculation
    const startDayIndex = startDayOfWeek === 7 ? 0 : startDayOfWeek; // Adjust for Monday start (0)
    
    // Create array for empty cells before the first day of the month
    const emptyCells = Array.from({ length: startDayIndex }, (_, i) => ({ isEmpty: true, index: i }));
    
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f1117 !important',
        color: '#d1d5db !important'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '4px'
        }}>
          {daysOfWeek.map((day, index) => (
            <div key={index} style={{
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '500',
              color: '#9ca3af !important',
              padding: '2px 0'
            }}>
              {day}
            </div>
          ))}
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          flex: '1'
        }}>
          {/* Empty cells for days before the first of the month */}
          {emptyCells.map(({ index }) => (
            <div key={`empty-${index}`} style={{
              backgroundColor: 'transparent !important'
            }}></div>
          ))}
          
          {/* Actual days of the month */}
          {displayData.map((item, index) => {
            const day = parseInt(item.displayDate);
            const isToday = item.isToday;
            const hasRevenue = item.revenue > 0;
            
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  minHeight: '40px',
                  border: '1px solid #1f2937 !important',
                  backgroundColor: '#0f1117 !important'
                }}
              >
                <div style={{
                  textAlign: 'center',
                  padding: '2px 0',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: '#1a1f2c !important',
                  color: '#d1d5db !important'
                }}>
                  {day}
                </div>
                
                <div style={{
                  flex: '1',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '2px'
                }}>
                  {hasRevenue ? (
                    <div style={{
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#d1d5db !important'
                    }}>
                      {renderRevenueValue(item.revenue)}
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      fontSize: '12px',
                      color: '#4b5563 !important'
                    }}>
                      -
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Calculate total revenue
  const totalRevenue = displayData.reduce((sum, item) => sum + item.revenue, 0);
  
  return (
    <div style={{
      height: '100%',
      backgroundColor: '#0f1117 !important',
      borderColor: '#1f2937 !important',
      color: '#d1d5db !important',
      borderRadius: '8px',
      border: '1px solid #1f2937',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '16px',
        paddingBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'white !important'
          }}>Revenue Calendar</div>
          <div style={{
            display: 'flex',
            gap: '4px'
          }}>
            <button
              style={{
                fontSize: '12px',
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                backgroundColor: timeFrame === 'today' ? '#1f2937 !important' : 'transparent !important',
                color: timeFrame === 'today' ? 'white !important' : '#d1d5db !important',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => handleTimeFrameChange('today')}
            >
              Today
            </button>
            <button
              style={{
                fontSize: '12px',
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                backgroundColor: timeFrame === 'weekly' ? '#1f2937 !important' : 'transparent !important',
                color: timeFrame === 'weekly' ? 'white !important' : '#d1d5db !important',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => handleTimeFrameChange('weekly')}
            >
              Week
            </button>
            <button
              style={{
                fontSize: '12px',
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                backgroundColor: timeFrame === 'monthly' ? '#1f2937 !important' : 'transparent !important',
                color: timeFrame === 'monthly' ? 'white !important' : '#d1d5db !important',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => handleTimeFrameChange('monthly')}
            >
              Month
            </button>
            <button
              style={{
                fontSize: '12px',
                height: '28px',
                padding: '0 12px',
                borderRadius: '6px',
                transition: 'all 0.2s',
                backgroundColor: timeFrame === 'yearly' ? '#1f2937 !important' : 'transparent !important',
                color: timeFrame === 'yearly' ? 'white !important' : '#d1d5db !important',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => handleTimeFrameChange('yearly')}
            >
              Year
            </button>
          </div>
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#9ca3af !important'
        }}>
          {getTitle()}
        </div>
      </div>
      
      <div style={{
        flex: '1',
        padding: '0 12px 12px 12px',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{
                animation: 'spin 1s linear infinite',
                borderRadius: '9999px',
                height: '32px',
                width: '32px',
                borderTop: '2px solid #6b7280',
                borderBottom: '2px solid #6b7280',
                marginBottom: '8px'
              }}></div>
              <div style={{
                color: '#9ca3af !important',
                fontSize: '14px'
              }}>Loading sales data...</div>
            </div>
          </div>
        ) : error ? (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              <div style={{
                backgroundColor: '#1f2937 !important',
                padding: '8px',
                borderRadius: '9999px',
                marginBottom: '8px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{height: '20px', width: '20px', color: '#9ca3af !important'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div style={{
                color: '#d1d5db !important',
                fontWeight: '500',
                marginBottom: '4px'
              }}>Error Loading Data</div>
              <div style={{
                color: '#9ca3af !important',
                fontSize: '14px'
              }}>{error}</div>
            </div>
          </div>
        ) : (
          renderMonthlyCalendar()
        )}
      </div>
      
      <div style={{
        padding: '8px',
        borderTop: '1px solid #1f2937 !important',
        backgroundColor: '#0f1117 !important',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          color: '#d1d5db !important',
          display: 'flex',
          alignItems: 'center'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{height: '16px', width: '16px', marginRight: '4px', color: '#d1d5db !important'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Total Revenue: ${totalRevenue.toLocaleString()}
        </div>
        <div style={{
          color: '#9ca3af !important',
          display: 'flex',
          alignItems: 'center'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" style={{height: '16px', width: '16px', marginRight: '4px', color: '#9ca3af !important'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Last updated: {format(lastUpdated, 'h:mm a')}
        </div>
      </div>
    </div>
  );
} 
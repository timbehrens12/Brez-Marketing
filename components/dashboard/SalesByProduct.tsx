"use client"

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { format, parseISO, isSameDay, differenceInDays, endOfDay, startOfDay, subDays } from 'date-fns'
import { MetricLineChart } from '@/components/metrics/MetricLineChart'
import { Loader2, ShoppingBag } from 'lucide-react'
import Image from 'next/image'

interface SalesByProductProps {
  brandId: string
  dateRange: {
    from: Date
    to: Date
  }
  isRefreshing?: boolean
}

interface ProductSalesData {
  date: string
  value: number
  quantity: number
}

interface Product {
  id: string
  title: string
  variant_title: string | null
  total_quantity: number
  total_sales: number
}

export function SalesByProduct({ brandId, dateRange, isRefreshing = false }: SalesByProductProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [salesData, setSalesData] = useState<ProductSalesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [isLoadingConnection, setIsLoadingConnection] = useState(true)

  // Listen for requests to share order data with other components
  useEffect(() => {
    const handleRequestData = () => {
      // console.log('[SalesByProduct] Received request for product data');
      // If we have orders, share them
      if (ordersCache && ordersCache.length > 0) {
        // console.log('[SalesByProduct] Responding with cached orders:', ordersCache.length);
        window.dispatchEvent(new CustomEvent('salesByProductData', {
          detail: {
            orders: ordersCache,
            totalProducts: products.length,
            selectedProductId
          }
        }));
      } else {
        // console.log('[SalesByProduct] No cached orders to share, will try to fetch');
        // Attempt to fetch orders and then share them
        fetchProducts().then(() => {
          if (ordersCache && ordersCache.length > 0) {
            // console.log('[SalesByProduct] Responding with freshly fetched orders:', ordersCache.length);
            window.dispatchEvent(new CustomEvent('salesByProductData', {
              detail: {
                orders: ordersCache,
                totalProducts: products.length,
                selectedProductId
              }
            }));
          }
        });
      }
    };
    
    // Listen for requests for our data
    window.addEventListener('requestSalesByProductData', handleRequestData);
    
    // Cleanup
    return () => {
      window.removeEventListener('requestSalesByProductData', handleRequestData);
    };
  }, [products, selectedProductId]);
  
  // Add a variable to cache orders
  const [ordersCache, setOrdersCache] = useState<any[]>([]);

  // First, get the connection_id for the brand
  useEffect(() => {
    const fetchConnectionId = async () => {
      if (!brandId) return;
      
      setIsLoadingConnection(true);
      
      try {
        const { data, error } = await supabase
          .from('platform_connections')
          .select('id')
          .eq('brand_id', brandId)
          .eq('platform_type', 'shopify')
          .eq('status', 'active')
          .single();
        
        if (error) {
          console.error('Error fetching connection:', error);
          setError('Failed to load connection data');
          return;
        }
        
        if (data) {
          // console.log('Found connection ID for brand:', data.id);
          setConnectionId(data.id);
        } else {
          // console.log('No active Shopify connection found for brand:', brandId);
          setError('No Shopify connection found');
        }
      } catch (err) {
        console.error('Error in fetchConnectionId:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsLoadingConnection(false);
      }
    };
    
    fetchConnectionId();
  }, [brandId]);

  // Fetch all products from orders
  const fetchProducts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (!connectionId) {
        console.error('Missing connectionId parameter');
        setError('No active Shopify connection');
        setIsLoading(false);
        return;
      }
      
      // Always use the exact date range from props - don't override the user's selection
      const fromDate = dateRange.from;
      const toDate = endOfDay(dateRange.to);
      
      // console.log('[SalesByProduct] Using date range from props:', 
      //   format(fromDate, 'yyyy-MM-dd'), 'to', format(toDate, 'yyyy-MM-dd'));
      
      const formattedFrom = format(fromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
      const formattedTo = format(toDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
      
      // console.log('Fetching products for connection:', connectionId, 'from:', formattedFrom, 'to:', formattedTo)
      
      const { data: orders, error } = await supabase
        .from('shopify_orders')
        .select('line_items, created_at, total_price, id, customer_id')
        .eq('connection_id', connectionId)
        .gte('created_at', formattedFrom)
        .lte('created_at', formattedTo)
      
      if (error) {
        console.error('Error fetching orders:', error)
        setError('Failed to load product data')
        setIsLoading(false)
        return
      }
      
      if (!orders || orders.length === 0) {
        // console.log('No orders found for the selected date range')
        setProducts([])
        setIsLoading(false)
        setOrdersCache([]) // Clear cache since we have no orders
        return
      }
      
      // console.log(`Found ${orders.length} orders with connection_id: ${connectionId}`)
      
      // Cache the orders for emergency use by other components
      setOrdersCache(orders)
      
      // Process orders to extract unique products and their sales data
      const productMap = new Map<string, Product>()
      
      orders.forEach((order: any) => {
        const lineItems = order.line_items || []
        
        lineItems.forEach((item: any) => {
          const productId = item.product_id?.toString() || item.id?.toString()
          if (!productId) return
          
          const title = item.title || 'Unknown Product'
          const variantTitle = item.variant_title || null
          const quantity = parseInt(item.quantity) || 0
          const price = parseFloat(item.price) || 0
          const totalPrice = quantity * price
          
          if (productMap.has(productId)) {
            const product = productMap.get(productId)!
            product.total_quantity += quantity
            product.total_sales += totalPrice
          } else {
            productMap.set(productId, {
              id: productId,
              title,
              variant_title: variantTitle,
              total_quantity: quantity,
              total_sales: totalPrice
            })
          }
        })
      })
      
      // Convert map to array and sort by total sales (highest first)
      const productArray = Array.from(productMap.values())
        .sort((a, b) => b.total_sales - a.total_sales)
      
      setProducts(productArray)
      
      // Select the top selling product by default
      if (productArray.length > 0 && !selectedProductId) {
        setSelectedProductId(productArray[0].id)
      }
      
    } catch (err) {
      console.error('Error in fetchProducts:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [connectionId, dateRange.from, dateRange.to, selectedProductId])
  
  // Fetch sales data for the selected product
  const fetchProductSalesData = useCallback(async () => {
    if (!selectedProductId) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      if (!connectionId) {
        console.error('Missing connectionId parameter')
        setError('No active Shopify connection')
        setIsLoading(false)
        return
      }
      
      // Always use the exact date range from props - don't override the user's selection
      const fromDate = dateRange.from;
      const toDate = endOfDay(dateRange.to);
      
      // console.log('[SalesByProduct] Using date range from props for product data:', 
      //   format(fromDate, 'yyyy-MM-dd'), 'to', format(toDate, 'yyyy-MM-dd'));
      
      const formattedFrom = format(fromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
      const formattedTo = format(toDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
      
      // console.log('Fetching sales data for product:', selectedProductId, 'connection:', connectionId, 'time now:', new Date().toISOString())
      // console.log('Using date range for query:', formattedFrom, 'to', formattedTo); // Add log for debugging
      
      // Force cache bypass by adding timestamp to ensure fresh data
      const timestamp = Date.now()
      
      const { data: orders, error } = await supabase
        .from('shopify_orders')
        .select('line_items, created_at')
        .eq('connection_id', connectionId)
        .gte('created_at', formattedFrom)
        .lte('created_at', formattedTo)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching orders:', error)
        setError('Failed to load sales data')
        setIsLoading(false)
        return
      }
      
      if (!orders || orders.length === 0) {
        // console.log('No orders found for the selected date range')
        setSalesData([])
        setIsLoading(false)
        return
      }
      
      // console.log(`Found ${orders.length} orders for product data, most recent:`, orders[0]?.created_at)
      
      // Process orders to extract sales data for the selected product
      const salesByDate = new Map<string, { value: number, quantity: number, hour: number }>()
      
      orders.forEach((order: any) => {
        // Parse the created_at timestamp correctly to get both date and time
        const orderTimestamp = parseISO(order.created_at)
        const orderHour = orderTimestamp.getHours()
        const orderDate = format(orderTimestamp, 'yyyy-MM-dd')
        const lineItems = order.line_items || []
        
        lineItems.forEach((item: any) => {
          const productId = item.product_id?.toString() || item.id?.toString()
          if (productId !== selectedProductId) return
          
          const quantity = parseInt(item.quantity) || 0
          const price = parseFloat(item.price) || 0
          const totalPrice = quantity * price
          
          const key = `${orderDate}T${orderHour}`
          
          if (salesByDate.has(key)) {
            const data = salesByDate.get(key)!
            data.value += totalPrice
            data.quantity += quantity
          } else {
            salesByDate.set(key, {
              value: totalPrice,
              quantity,
              hour: orderHour
            })
          }
        })
      })
      
      // Fill in missing dates/hours in the range
      const start = new Date(dateRange.from)
      const end = new Date(dateRange.to)
      const currentDate = new Date(start)
      
      // For single day view, we want to fill in all hours of the day
      if (isSameDay(dateRange.from, dateRange.to)) {
        const dateStr = format(start, 'yyyy-MM-dd')
        // Create entries for each hour (0-23)
        for (let hour = 0; hour < 24; hour++) {
          const key = `${dateStr}T${hour}`
          if (!salesByDate.has(key)) {
            salesByDate.set(key, { value: 0, quantity: 0, hour })
          }
        }
      } else {
        // For multi-day view, create one entry per day
        while (currentDate <= end) {
          const dateStr = format(currentDate, 'yyyy-MM-dd')
          // Use noon (12) as the default hour for daily data display
          const key = `${dateStr}T12`
          if (!salesByDate.has(key)) {
            salesByDate.set(key, { value: 0, quantity: 0, hour: 12 })
          }
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
      
      // Convert map to array and create appropriate data format for the chart
      const salesArray = Array.from(salesByDate.entries())
        .map(([key, data]) => {
          const [datePart, hourStr] = key.split('T')
          const hour = parseInt(hourStr)
          const date = parseISO(datePart)
          
          // Single day view
          if (isSameDay(dateRange.from, dateRange.to)) {
            return {
              date: datePart,
              hour,
              displayHour: hour % 4 === 0 ? (hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`) : '',
              formattedTime: hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`,
              formattedDate: format(date, 'MMM dd'),
              value: data.value,
              quantity: data.quantity
            }
          } 
          // Multi-day view
          else {
            return {
              date: datePart,
              displayDate: format(date, 'MMM dd'),
              value: data.value,
              quantity: data.quantity
            }
          }
        })
        // Sort by date and hour
        .sort((a, b) => {
          // With type checking to avoid undefined error
          if ('hour' in a && 'hour' in b && typeof a.hour === 'number' && typeof b.hour === 'number') {
            // For single day, sort by hour
            return a.hour - b.hour
          } else {
            // For multi-day, sort by date
            return a.date.localeCompare(b.date)
          }
        })
      
      // console.log('Processed sales data:', salesArray)
      setSalesData(salesArray)
      
    } catch (err) {
      console.error('Error in fetchProductSalesData:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [connectionId, dateRange.from, dateRange.to, selectedProductId])
  
  // Fetch products when connection ID is available
  useEffect(() => {
    if (connectionId) {
      fetchProducts();
    }
  }, [connectionId, dateRange.from, dateRange.to, isRefreshing, fetchProducts]);
  
  // Fetch sales data when selected product changes
  useEffect(() => {
    if (connectionId && selectedProductId) {
      fetchProductSalesData();
    }
  }, [connectionId, selectedProductId, dateRange.from, dateRange.to, isRefreshing, fetchProductSalesData]);
  
  // Add a more aggressive refresh trigger
  useEffect(() => {
    // Listen for the page-refresh event
    const handlePageRefresh = (event: any) => {
      // console.log('SalesByProduct: Received page-refresh event, refreshing product data');
      if (connectionId && selectedProductId) {
        fetchProducts();
        fetchProductSalesData();
      }
    };

    window.addEventListener('page-refresh', handlePageRefresh);
    
    // Also listen for the metaDataRefreshed event for backward compatibility
    window.addEventListener('metaDataRefreshed', handlePageRefresh);
    
    // Listen for Shopify refresh events
    window.addEventListener('force-shopify-refresh', handlePageRefresh);
    window.addEventListener('global-refresh-all', handlePageRefresh);
    window.addEventListener('force-widget-refresh', handlePageRefresh);
    
    return () => {
      window.removeEventListener('page-refresh', handlePageRefresh);
      window.removeEventListener('metaDataRefreshed', handlePageRefresh);
      window.removeEventListener('force-shopify-refresh', handlePageRefresh);
      window.removeEventListener('global-refresh-all', handlePageRefresh);
      window.removeEventListener('force-widget-refresh', handlePageRefresh);
    };
  }, [connectionId, selectedProductId, fetchProducts, fetchProductSalesData]);
  
  // Get the selected product details
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId)
  }, [products, selectedProductId])
  
  // Calculate total sales and quantity for the selected product
  const totalSales = useMemo(() => {
    return salesData.reduce((sum, item) => sum + item.value, 0)
  }, [salesData])
  
  const totalQuantity = useMemo(() => {
    return salesData.reduce((sum, item) => sum + item.quantity, 0)
  }, [salesData])
  
  // Format currency
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200 shadow-md overflow-hidden">
      <CardHeader className="p-3 pb-1.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-200">
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Sales by Product</span>
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardTitle>
          <div className="flex items-center">
            {isRefreshing && <Loader2 className="h-4 w-4 animate-spin text-white" />}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-2">
        {isLoadingConnection || isRefreshing ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-[120px] w-full bg-gray-700" />
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-[120px] w-full bg-gray-700" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm p-4 text-center">{error}</div>
        ) : products.length === 0 ? (
          <div className="text-gray-400 text-sm p-4 text-center">No products found for the selected date range</div>
        ) : (
          <>
            <div className="mb-3">
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
                disabled={isLoading || products.length === 0}
              >
                <SelectTrigger className="w-full bg-[#222] border-[#444] text-white text-sm h-8">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#444] text-white">
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.title} {product.variant_title ? `(${product.variant_title})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedProduct ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-400">Total Sales</div>
                    <div className="text-xl font-bold text-white">{formatCurrency(totalSales)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Units Sold</div>
                    <div className="text-xl font-bold text-white">{totalQuantity}</div>
                  </div>
                </div>
                
                <div className="h-[220px]">
                  <MetricLineChart 
                    data={salesData}
                    dateRange={dateRange}
                    valuePrefix="$"
                    valueFormat="currency"
                    color="#4ade80"
                    height={220}
                  />
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm p-4 text-center">Select a product to view sales data</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 
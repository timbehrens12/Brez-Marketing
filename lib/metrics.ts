import type { Metrics } from "@/types/metrics"

export function calculateMetrics(
  orders: any[],
  products: any[],
  refunds: any[],
  dateRange?: { from: Date; to: Date },
  metaData?: any
): Metrics {
  // Ensure we have arrays even if undefined is passed
  const safeOrders = orders || []
  const safeProducts = products || []
  const safeRefunds = refunds || []

  // Filter orders by date range if provided
  const filteredOrders = dateRange 
    ? safeOrders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= dateRange.from && orderDate <= dateRange.to
      })
    : safeOrders

  // Safe calculations with null checks
  const totalSales = filteredOrders.reduce((sum, order) => {
    const price = parseFloat(order?.total_price || '0')
    return sum + (isNaN(price) ? 0 : price)
  }, 0)

  const totalRefunds = safeRefunds.reduce((sum, refund) => {
    const amount = parseFloat(refund?.amount || '0')
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  const returnRate = totalSales > 0 ? (totalRefunds / totalSales) : 0
  const averageOrderValue = filteredOrders.length > 0 ? (totalSales / filteredOrders.length) : 0

  console.log('Calculated metrics:', { totalSales, totalRefunds, returnRate, averageOrderValue })
  
  // Add more metric calculations here
  
  const defaultMetrics = {
    totalSales,
    salesGrowth: 0,
    averageOrderValue,
    aovGrowth: 0,
    salesData: [],
    ordersPlaced: filteredOrders.length,
    previousOrdersPlaced: 0,
    unitsSold: filteredOrders.reduce((sum, order) => sum + order.line_items.length, 0),
    previousUnitsSold: 0,
    orderCount: filteredOrders.length,
    previousOrderCount: 0,
    topProducts: safeProducts,
    customerRetentionRate: 0,
    revenueByDay: [],
    sessionCount: 0,
    sessionGrowth: 0,
    sessionData: [],
    conversionRate: 0,
    conversionRateGrowth: 0,
    conversionData: [],
    retentionRateGrowth: 0,
    retentionData: [],
    currentWeekRevenue: [],
    inventoryLevels: 0,
    returnRate,
    inventoryData: [],
    returnData: [],
    customerLifetimeValue: 0,
    clvData: [],
    dailyData: [],
    chartData: [],
    averageTimeToFirstPurchase: 0,
    timeToFirstPurchaseData: [],
    categoryPerformance: [],
    categoryData: [],
    shippingZones: [],
    shippingData: [],
    paymentMethods: [],
    paymentData: [],
    discountPerformance: [],
    discountData: [],
    customerSegments: { newCustomers: 0, returningCustomers: 0 },
    firstTimeVsReturning: {
      firstTime: { orders: 0, revenue: 0 },
      returning: { orders: 0, revenue: 0 }
    },
    customerSegmentData: []
  }

  const metrics = {
    ...defaultMetrics,
    // Add Meta metrics if metaData exists
    ...(metaData && {
      impressions: metaData.impressions || 0,
      clicks: metaData.clicks || 0,
      conversions: metaData.conversions || 0,
      adSpend: metaData.spend || 0
    })
  }
  
  return metrics
} 
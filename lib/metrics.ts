import type { Metrics } from "@/types/metrics"

export function calculateMetrics(
  orders: any[],
  products: any[],
  refunds: any[],
  dateRange?: { from: Date; to: Date }
): Metrics {
  // Filter orders by date range if provided
  const filteredOrders = dateRange 
    ? orders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= dateRange.from && orderDate <= dateRange.to
      })
    : orders

  const totalSales = filteredOrders.reduce((sum, order) => sum + parseFloat(order.total_price), 0)
  const totalRefunds = refunds.reduce((sum, refund) => sum + parseFloat(refund.amount), 0)
  const returnRate = totalRefunds / totalSales || 0
  const averageOrderValue = totalSales / filteredOrders.length || 0
  
  // Add more metric calculations here
  
  return {
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
    topProducts: products,
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
} 
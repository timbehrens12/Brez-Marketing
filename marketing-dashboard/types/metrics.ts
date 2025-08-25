export interface MetricData {
  date: string
  value: number
  comparisonValue?: number
  ordersPlaced?: number
  unitsSold?: number
  segment?: string
}

export interface SessionData {
  sessions: number
  conversions: number
}

export interface ProductSales {
  name: string
  quantity: number
  revenue: number
}

export interface CategoryPerformance {
  name: string
  revenue: number
  orders: number
  units: number
}

export interface ShippingZoneMetrics {
  zone: string
  orders: number
  revenue: number
  averageDeliveryTime: number
}

export interface PaymentMethodMetrics {
  method: string
  count: number
  revenue: number
}

export interface DiscountMetrics {
  code: string
  uses: number
  revenue: number
  savings: number
}

export interface CustomerSegmentMetrics {
  segment: string
  revenue: number
  orders: number
  averageOrderValue: number
}

export interface CustomerSegments {
  newCustomers: number
  returningCustomers: number
}

export interface Metrics {
  totalSales: number
  salesGrowth: number
  averageOrderValue: number
  aovGrowth: number
  salesData: MetricData[]
  ordersPlaced: number
  previousOrdersPlaced: number
  unitsSold: number
  previousUnitsSold: number
  orderCount: number
  previousOrderCount: number
  topProducts: ProductSales[]
  customerRetentionRate: number
  revenueByDay: number[]
  sessionCount: number
  sessionGrowth: number
  sessionData: MetricData[]
  conversionRate: number
  conversionRateGrowth: number
  conversionData: MetricData[]
  retentionRateGrowth: number
  retentionData: MetricData[]
  currentWeekRevenue: number[]
  inventoryLevels: number
  returnRate: number
  inventoryData: MetricData[]
  returnData: MetricData[]
  customerLifetimeValue: number
  clvData: MetricData[]
  averageTimeToFirstPurchase: number
  timeToFirstPurchaseData: MetricData[]
  categoryPerformance: CategoryPerformance[]
  categoryData: MetricData[]
  shippingZones: ShippingZoneMetrics[]
  shippingData: MetricData[]
  paymentMethods: PaymentMethodMetrics[]
  paymentData: MetricData[]
  discountPerformance: DiscountMetrics[]
  discountData: MetricData[]
  customerSegments: CustomerSegments
  firstTimeVsReturning: {
    firstTime: { orders: number; revenue: number }
    returning: { orders: number; revenue: number }
  }
  customerSegmentData: MetricData[]
}

export interface ComparisonDates {
  from: Date
  to: Date
}


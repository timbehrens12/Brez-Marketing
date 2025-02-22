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
  dailyData: any[]
  chartData: any[]
  timeseriesData: any[]
  impressions: number
  impressionGrowth: number
  clicks: number
  clickGrowth: number
  conversions: number
  conversionGrowth: number
  adSpend: number
  adSpendGrowth: number
  unitsGrowth: number
  retentionGrowth: number
  ordersGrowth: number
  returnGrowth: number
}

export interface ComparisonDates {
  from: Date
  to: Date
}

export interface MetaMetrics {
  totalSales: number
  salesGrowth: number
  averageOrderValue: number
  aovGrowth: number
  ordersPlaced: number
  ordersGrowth: number
  impressions: number
  impressionGrowth: number
  clicks: number
  clickGrowth: number
  conversions: number
  conversionGrowth: number
  adSpend: number
  adSpendGrowth: number
  unitsGrowth: number
  retentionGrowth: number
  dailyData: any[]
  chartData: any[]
  timeseriesData: any[]
  unitsSold: number
  conversionRate: number
  customerRetentionRate: number
  returnRate: number
  inventoryLevels: number
  inventoryGrowth: number
  topProducts: any[]
  returnGrowth: number
}

export const defaultMetrics: Metrics = {
  totalSales: 0,
  salesGrowth: 0,
  averageOrderValue: 0,
  aovGrowth: 0,
  ordersPlaced: 0,
  ordersGrowth: 0,
  salesData: [],
  previousOrdersPlaced: 0,
  unitsSold: 0,
  previousUnitsSold: 0,
  orderCount: 0,
  previousOrderCount: 0,
  impressions: 0,
  impressionGrowth: 0,
  clicks: 0,
  clickGrowth: 0,
  conversions: 0,
  conversionGrowth: 0,
  adSpend: 0,
  adSpendGrowth: 0,
  unitsGrowth: 0,
  retentionGrowth: 0,
  topProducts: [],
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
  returnRate: 0,
  inventoryData: [],
  returnData: [],
  customerLifetimeValue: 0,
  clvData: [],
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
  firstTimeVsReturning: { firstTime: { orders: 0, revenue: 0 }, returning: { orders: 0, revenue: 0 } },
  customerSegmentData: [],
  dailyData: [],
  chartData: [],
  timeseriesData: [],
  returnGrowth: 0
}


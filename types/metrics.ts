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

export interface DailyData {
  date: string
  orders: number
  revenue: number
  value: number // For MetricCard compatibility
}

export interface Metrics {
  totalSales: number
  ordersPlaced: number
  averageOrderValue: number
  unitsSold: number
  salesGrowth: number
  ordersGrowth: number
  unitsGrowth: number
  aovGrowth: number
  customerRetentionRate: number
  retentionGrowth: number
  returnRate: number
  returnGrowth: number
  conversionRate: number
  conversionRateGrowth: number
  revenueByDay: Array<{ date: string; amount: number }>
  topProducts: Array<{ id: string; title: string; quantity: number; revenue: number }>
  customerSegments: CustomerSegments
  dailyData: Array<DailyData>
  adSpend: number
  adSpendGrowth: number
  roas: number
  roasGrowth: number
  impressions: number
  impressionGrowth: number
  ctr: number
  ctrGrowth: number
  clicks: number
  clickGrowth: number
  conversions: number
  conversionGrowth: number
  costPerResult: number
  cprGrowth: number
  salesData?: Array<{ date: string; value: number }>
  ordersData?: Array<{ date: string; value: number }>
  aovData?: Array<{ date: string; value: number }>
  unitsSoldData?: Array<{ date: string; value: number }>
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
  unitsSold: number
  unitsGrowth: number
  impressions: number
  impressionGrowth: number
  clicks: number
  clickGrowth: number
  conversions: number
  conversionGrowth: number
  adSpend: number
  adSpendGrowth: number
  roas: number
  roasGrowth: number
  ctr: number
  ctrGrowth: number
  cpc: number
  cpcGrowth: number
  costPerResult: number
  cprGrowth: number
  customerRetentionRate: number
  retentionGrowth: number
  returnRate: number
  returnGrowth: number
  conversionRate: number
  inventoryLevels: number
  inventoryGrowth: number
  dailyData: any[]
  chartData: any[]
  timeseriesData: any[]
  topProducts: any[]
}

export interface Product {
  id: string
  name: string
  quantity: number
  revenue: number
}

export interface DayData {
  day: string
  date: string
  revenue: number | null
}

export const defaultMetrics: Metrics = {
  totalSales: 0,
  salesGrowth: 0,
  ordersPlaced: 0,
  ordersGrowth: 0,
  unitsSold: 0,
  unitsGrowth: 0,
  averageOrderValue: 0,
  aovGrowth: 0,
  customerRetentionRate: 0,
  retentionGrowth: 0,
  returnRate: 0,
  returnGrowth: 0,
  conversionRate: 0,
  conversionRateGrowth: 0,
  dailyData: [],
  revenueByDay: [],
  customerSegments: {
    newCustomers: 0,
    returningCustomers: 0
  },
  topProducts: [],
  adSpend: 0,
  adSpendGrowth: 0,
  roas: 0,
  roasGrowth: 0,
  impressions: 0,
  impressionGrowth: 0,
  ctr: 0,
  ctrGrowth: 0,
  clicks: 0,
  clickGrowth: 0,
  conversions: 0,
  conversionGrowth: 0,
  costPerResult: 0,
  cprGrowth: 0
}


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
  salesData: MetricData[]
  dailyData: any[]
  chartData: any[]
  timeseriesData: any[]
  topProducts: any[]
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

export const defaultMetrics: Metrics = {
  totalSales: 0,
  salesGrowth: 0,
  averageOrderValue: 0,
  aovGrowth: 0,
  ordersPlaced: 0,
  ordersGrowth: 0,
  unitsSold: 0,
  unitsGrowth: 0,
  impressions: 0,
  impressionGrowth: 0,
  clicks: 0,
  clickGrowth: 0,
  conversions: 0,
  conversionGrowth: 0,
  adSpend: 0,
  adSpendGrowth: 0,
  roas: 0,
  roasGrowth: 0,
  ctr: 0,
  ctrGrowth: 0,
  cpc: 0,
  cpcGrowth: 0,
  costPerResult: 0,
  cprGrowth: 0,
  customerRetentionRate: 0,
  retentionGrowth: 0,
  returnRate: 0,
  returnGrowth: 0,
  conversionRate: 0,
  inventoryLevels: 0,
  inventoryGrowth: 0,
  salesData: [],
  dailyData: [],
  chartData: [],
  timeseriesData: [],
  topProducts: []
}


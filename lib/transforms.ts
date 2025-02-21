import type { Metrics } from "@/types/metrics"

export interface MetaMetrics {
  totalSales: number
  salesGrowth: number
  averageOrderValue: number
  aovGrowth: number
  ordersPlaced: number
  ordersGrowth: number
  unitsSold: number
  unitsGrowth: number
  conversionRate: number
  conversionGrowth: number
  customerRetentionRate: number
  retentionGrowth: number
  returnRate: number
  returnGrowth: number
  inventoryLevels: number
  inventoryGrowth: number
  topProducts: any[]
  dailyData: any[]
  chartData: any[]
}

export function transformToMetaMetrics(metrics: Metrics): MetaMetrics {
  return {
    totalSales: metrics.totalSales,
    salesGrowth: metrics.salesGrowth,
    averageOrderValue: metrics.averageOrderValue,
    aovGrowth: metrics.aovGrowth,
    ordersPlaced: metrics.ordersPlaced,
    ordersGrowth: metrics.retentionRateGrowth || 0,
    unitsSold: metrics.unitsSold,
    unitsGrowth: metrics.salesGrowth || 0,
    conversionRate: metrics.conversionRate,
    conversionGrowth: metrics.conversionRateGrowth || 0,
    customerRetentionRate: metrics.customerRetentionRate,
    retentionGrowth: metrics.retentionRateGrowth || 0,
    returnRate: metrics.returnRate,
    returnGrowth: 0,
    inventoryLevels: metrics.inventoryLevels,
    inventoryGrowth: 0,
    topProducts: metrics.topProducts || [],
    dailyData: metrics.dailyData || [],
    chartData: metrics.chartData || []
  }
}

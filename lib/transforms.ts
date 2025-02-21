import type { Metrics, MetaMetrics } from '@/types/metrics'

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
    returnRate: metrics.returnRate || 0,
    returnGrowth: 0,
    inventoryLevels: metrics.inventoryLevels || 0,
    inventoryGrowth: 0,
    topProducts: metrics.topProducts || [],
    dailyData: metrics.dailyData || [],
    chartData: metrics.chartData || []
  }
}

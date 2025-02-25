import type { Order } from "@/types/shopify"
import type { DateRange } from "react-day-picker"
import type { ComparisonType } from "@/components/ComparisonPicker"
import type { Metrics, ProductSales, MetricData } from "@/types/metrics"
import {
  startOfDay,
  endOfDay,
  isWithinInterval,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  isValid,
  addHours,
  startOfWeek,
  endOfWeek,
  addDays,
} from "date-fns"
import { toZonedTime } from "date-fns-tz"

// Create a custom utcToZonedTime function
const utcToZonedTime = (date: Date | number, timeZone: string): Date => {
  return toZonedTime(date, timeZone)
}

const SHOPIFY_TIMEZONE = "America/New_York"

function ensureValidDateRange(start: Date, end: Date): DateRangeWithStartEnd {
  // Convert the dates to Shopify's timezone
  let zonedStart = utcToZonedTime(start, SHOPIFY_TIMEZONE)
  let zonedEnd = utcToZonedTime(end, SHOPIFY_TIMEZONE)

  // Ensure start is not after end
  if (zonedStart > zonedEnd) {
    const temp = zonedStart
    zonedStart = zonedEnd
    zonedEnd = temp
  }

  // If start and end are the same, preserve the full day's hours in Shopify's timezone
  if (isSameDay(zonedStart, zonedEnd)) {
    const startOfZonedDay = new Date(zonedStart)
    startOfZonedDay.setHours(0, 0, 0, 0)

    const endOfZonedDay = new Date(zonedEnd)
    endOfZonedDay.setHours(23, 59, 59, 999)

    // Convert back to UTC for storage
    return {
      start: new Date(startOfZonedDay),
      end: new Date(endOfZonedDay),
    }
  }

  // Convert back to UTC for storage
  return {
    start: new Date(startOfDay(zonedStart)),
    end: new Date(endOfDay(zonedEnd)),
  }
}

// Update the generateSalesData function to handle dates correctly
function generateSalesData(orders: Order[], refunds: Order[], range: DateRangeWithStartEnd) {
  const zonedStart = utcToZonedTime(range.start, SHOPIFY_TIMEZONE)
  const zonedEnd = utcToZonedTime(range.end, SHOPIFY_TIMEZONE)
  const isSingleDay = isSameDay(zonedStart, zonedEnd)

  // Generate intervals only for the selected date range
  const intervals = isSingleDay
    ? Array.from({ length: 24 }, (_, i) => {
        const date = new Date(zonedStart)
        date.setHours(i, 0, 0, 0)
        return date
      })
    : eachDayOfInterval({ start: zonedStart, end: zonedEnd })

  const sales = intervals.reduce(
    (acc: Record<string, { value: number; ordersPlaced: number; unitsSold: number }>, interval: Date) => {
      const key = isSingleDay ? format(interval, "yyyy-MM-dd'T'HH:mm:ss") : format(interval, "yyyy-MM-dd")
      acc[key] = {
        value: 0,
        ordersPlaced: 0,
        unitsSold: 0,
      }
      return acc
    },
    {},
  )

  // Process orders
  orders.forEach((order) => {
    const orderDate = utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE)

    if (isValid(orderDate) && isWithinInterval(orderDate, { start: zonedStart, end: zonedEnd })) {
      const key = isSingleDay ? format(orderDate, "yyyy-MM-dd'T'HH:mm:ss") : format(orderDate, "yyyy-MM-dd")

      if (key in sales) {
        const isFullyRefunded = refunds.some(
          (refund) => refund.order_id === order.id && Number(refund.total_price) >= Number(order.total_price),
        )

        if (!isFullyRefunded) {
          const orderTotal = Number(order.total_price || 0)
          sales[key].value += orderTotal
          sales[key].ordersPlaced += 1
          sales[key].unitsSold += order.line_items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        }
      }
    }
  })

  // Process refunds
  refunds.forEach((refund) => {
    const refundDate = utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE)

    if (isValid(refundDate) && isWithinInterval(refundDate, { start: zonedStart, end: zonedEnd })) {
      const key = isSingleDay ? format(refundDate, "yyyy-MM-dd'T'HH:mm:ss") : format(refundDate, "yyyy-MM-dd")

      if (key in sales) {
        sales[key].value -= Number(refund.total_price || 0)
      }
    }
  })

  // Return only the data points within the selected range
  return intervals.map((interval) => {
    const key = isSingleDay ? format(interval, "yyyy-MM-dd'T'HH:mm:ss") : format(interval, "yyyy-MM-dd")
    return {
      date: key,
      value: sales[key].value,
      ordersPlaced: sales[key].ordersPlaced,
      unitsSold: sales[key].unitsSold,
    }
  })
}

function generateHourlyData(orders: Order[], refunds: Order[], range: DateRangeWithStartEnd): MetricData[] {
  const timezone = "America/New_York" // Shopify's timezone
  const zonedStart = utcToZonedTime(range.start, timezone)
  const zonedEnd = utcToZonedTime(range.end, timezone)

  // Create 24 hourly intervals
  const intervals = Array.from({ length: 24 }, (_, i) => {
    const date = new Date(zonedStart)
    date.setHours(i, 0, 0, 0)
    return date
  })

  const hourlyData = intervals.reduce(
    (acc: Record<string, { value: number; ordersPlaced: number; unitsSold: number }>, interval) => {
      const key = format(interval, "HH:mm")
      acc[key] = {
        value: 0,
        ordersPlaced: 0,
        unitsSold: 0,
      }
      return acc
    },
    {},
  )

  // Process orders
  orders.forEach((order) => {
    const orderDate = utcToZonedTime(parseISO(order.created_at), timezone)
    if (isWithinInterval(orderDate, { start: zonedStart, end: zonedEnd })) {
      const hour = format(orderDate, "HH:mm")

      const isFullyRefunded = refunds.some(
        (refund) => refund.order_id === order.id && Number(refund.total_price) >= Number(order.total_price),
      )

      if (!isFullyRefunded && hourlyData[hour]) {
        hourlyData[hour].value += Number(order.total_price || 0)
        hourlyData[hour].ordersPlaced += 1
        hourlyData[hour].unitsSold += order.line_items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      }
    }
  })

  // Process refunds
  refunds.forEach((refund) => {
    const refundDate = utcToZonedTime(parseISO(refund.created_at), timezone)
    if (isWithinInterval(refundDate, { start: zonedStart, end: zonedEnd })) {
      const hour = format(refundDate, "HH:mm")
      if (hourlyData[hour]) {
        hourlyData[hour].value -= Number(refund.total_price || 0)
      }
    }
  })

  // Convert to array format
  return intervals.map((interval) => {
    const hour = format(interval, "HH:mm")
    return {
      date: hour,
      value: hourlyData[hour].value,
      ordersPlaced: hourlyData[hour].ordersPlaced,
      unitsSold: hourlyData[hour].unitsSold || 0, // Ensure unitsSold is always defined
    }
  })
}

const generateHourlyDataOld = (start: Date, end: Date, dataFn: (hour: Date) => number): MetricData[] => {
  const data: MetricData[] = []
  let currentHour = startOfDay(start)
  const endHour = endOfDay(end)

  while (currentHour <= endHour) {
    data.push({
      date: format(currentHour, "HH:00"),
      value: dataFn(currentHour),
    })
    currentHour = addHours(currentHour, 1)
  }

  return data
}

const calculateTopProducts = (orders: Order[], refunds: Order[]): ProductSales[] => {
  const productSales = orders.reduce(
    (acc, order) => {
      order.line_items?.forEach((item) => {
        const productId = item.product_id || item.variant_id
        if (!acc[productId]) {
          acc[productId] = { name: item.title, quantity: 0, revenue: 0 }
        }
        acc[productId].quantity += item.quantity || 0
        acc[productId].revenue += (Number(item.price) || 0) * (item.quantity || 0)
      })
      return acc
    },
    {} as Record<string | number, ProductSales>,
  )

  refunds.forEach((refund) => {
    refund.line_items?.forEach((item) => {
      const productId = item.product_id || item.variant_id
      if (productSales[productId]) {
        productSales[productId].quantity -= item.quantity || 0
        productSales[productId].revenue -= (Number(item.price) || 0) * (item.quantity || 0)
      }
    })
  })

  return Object.values(productSales)
    .filter((product) => product.quantity > 0 && product.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
}

const calculateCustomerRetentionRate = (orders: Order[]): number => {
  const uniqueCustomers = new Set(orders.map((order) => order.customer?.id).filter(Boolean))
  const returningCustomers = new Set(
    orders
      .filter((order) => {
        const customerOrders = orders.filter((o) => o.customer?.id === order.customer?.id)
        return customerOrders.length > 1
      })
      .map((order) => order.customer?.id)
      .filter(Boolean),
  )
  return uniqueCustomers.size === 0 ? 0 : (returningCustomers.size / uniqueCustomers.size) * 100
}

const calculateRevenueByDay = (orders: Order[], refunds: Order[]): number[] => {
  const revenueByDay = Array(7).fill(0)

  orders.forEach((order) => {
    const orderDate = addDays(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE), 1)
    const dayIndex = orderDate.getDay()
    revenueByDay[dayIndex] += Number(order.total_price || 0)
  })

  refunds.forEach((refund) => {
    const refundDate = addDays(utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE), 1)
    const dayIndex = refundDate.getDay()
    revenueByDay[dayIndex] -= Number(refund.total_price || 0)
  })

  return revenueByDay
}

const calculateOverallConversionRate = (orders: Order[]): number => {
  return 0 // Replace with actual calculation if needed
}

const calculateCurrentWeekRevenue = (orders: Order[], refunds: Order[]): number[] => {
  const today = new Date()
  // Convert today to Shopify's timezone
  const zonedToday = utcToZonedTime(today, SHOPIFY_TIMEZONE)

  // Start the week on Sunday in Shopify's timezone
  const startOfCurrentWeek = startOfWeek(zonedToday, { weekStartsOn: 0 })
  const endOfCurrentWeek = endOfWeek(zonedToday, { weekStartsOn: 0 })

  const weekRevenue = Array(7).fill(0)

  orders.forEach((order) => {
    // Convert order date to Shopify's timezone
    const orderDate = addDays(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE), 1)

    if (isWithinInterval(orderDate, { start: startOfCurrentWeek, end: endOfCurrentWeek })) {
      const dayIndex = orderDate.getDay()
      weekRevenue[dayIndex] += Number(order.total_price || 0)
    }
  })

  refunds.forEach((refund) => {
    const refundDate = addDays(utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE), 1)
    if (isWithinInterval(refundDate, { start: startOfCurrentWeek, end: endOfCurrentWeek })) {
      const dayIndex = refundDate.getDay()
      weekRevenue[dayIndex] -= Number(refund.total_price || 0)
    }
  })

  // Rotate the array so that it starts with Monday (index 1) and Sunday is at the end
  return [...weekRevenue.slice(1), weekRevenue[0]]
}

const calculateInventoryLevels = (products: ShopifyProduct[], date: Date): number => {
  return products.reduce((total, product) => {
    return (
      total +
      (product.variants?.reduce((variantTotal, variant) => {
        // Check if the variant has inventory management
        if (variant.inventory_management === "shopify") {
          return variantTotal + (variant.inventory_quantity || 0)
        }
        return variantTotal
      }, 0) || 0)
    )
  }, 0)
}

const calculateReturnRate = (orders: Order[], refunds: Order[]): number => {
  const totalRefunds = refunds.length // Simplify for now, adjust if needed based on date range
  return orders.length > 0 ? (totalRefunds / orders.length) * 100 : 0
}

// Add proper type for products
type ShopifyProduct = {
  variants?: Array<{
    inventory_management?: string
    inventory_quantity?: number
  }>
}

// Update the calculateMetrics function's total sales calculation
export function calculateMetrics(
  orders: Order[],
  products: ShopifyProduct[],
  refunds: Order[],
  dateRange: DateRange | undefined,
): Metrics {
  const defaultMetrics: Metrics = {
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

  if (!Array.isArray(orders) || orders.length === 0 || !dateRange?.from || !dateRange?.to) {
    return defaultMetrics
  }

  const currentRange = ensureValidDateRange(dateRange.from, dateRange.to)
  const isSingleDay = isSameDay(currentRange.start, currentRange.end)

  // Filter orders and refunds
  const filteredOrders = orders.filter((order) => {
    const orderDate = utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE)
    return isWithinInterval(orderDate, currentRange)
  })

  const filteredRefunds = refunds.filter((refund) => {
    const refundDate = utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE)
    return isWithinInterval(refundDate, currentRange)
  })

  // Generate appropriate data based on view type
  const salesData = isSingleDay
    ? generateHourlyData(filteredOrders, filteredRefunds, currentRange)
    : generateSalesData(filteredOrders, filteredRefunds, currentRange)

  // Calculate total sales
  const totalSales = filteredOrders.reduce((sum, order) => {
    const orderTotal = Number(order.total_price || 0)
    const orderRefunds = filteredRefunds
      .filter((refund) => refund.order_id === order.id)
      .reduce((refundSum, refund) => refundSum + Number(refund.total_price || 0), 0)
    return sum + orderTotal - orderRefunds
  }, 0)

  // Calculate other metrics
  const ordersPlaced = filteredOrders.length
  const averageOrderValue = ordersPlaced > 0 ? totalSales / ordersPlaced : 0
  const unitsSold = salesData.reduce((sum, day) => sum + (day.unitsSold || 0), 0)

  // Generate sample data for category performance and customer segments
  const categoryPerformance = [
    { name: "Electronics", revenue: 50000, orders: 100, units: 150 },
    { name: "Clothing", revenue: 30000, orders: 200, units: 300 },
    { name: "Home & Garden", revenue: 20000, orders: 80, units: 100 },
  ]

  // Calculate customer segments
  const customersByID = new Map()
  filteredOrders.forEach((order) => {
    if (order.customer?.id) {
      const customerId = order.customer.id
      if (!customersByID.has(customerId)) {
        customersByID.set(customerId, [])
      }
      customersByID.get(customerId).push(order)
    }
  })

  const customerSegments = {
    newCustomers: Array.from(customersByID.values()).filter((orders) => orders.length === 1).length,
    returningCustomers: Array.from(customersByID.values()).filter((orders) => orders.length > 1).length,
  }

  const customerSegmentData: MetricData[] = [
    {
      date: format(currentRange.start, "yyyy-MM-dd"),
      value: customerSegments.newCustomers,
      segment: "New Customers",
    },
    {
      date: format(currentRange.start, "yyyy-MM-dd"),
      value: customerSegments.returningCustomers,
      segment: "Returning Customers",
    },
  ]

  // Calculate current week's revenue separately
  const currentWeekRevenue = calculateCurrentWeekRevenue(filteredOrders, filteredRefunds)

  // Return updated metrics with all time-series data
  return {
    ...defaultMetrics,
    totalSales,
    salesGrowth: 0,
    averageOrderValue,
    aovGrowth: 0,
    ordersPlaced,
    ordersGrowth: 0,
    unitsSold,
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
    customerRetentionRate: calculateCustomerRetentionRate(filteredOrders),
    retentionGrowth: 0,
    returnRate: calculateReturnRate(filteredOrders, filteredRefunds),
    returnGrowth: 0,
    conversionRate: calculateOverallConversionRate(filteredOrders),
    inventoryLevels: calculateInventoryLevels(products, currentRange.end),
    inventoryGrowth: 0,
    salesData: salesData,
    dailyData: [],
    chartData: [],
    timeseriesData: [],
    topProducts: calculateTopProducts(filteredOrders, filteredRefunds)
  }
}

const generateInventoryData = (
  products: ShopifyProduct[],
  orders: Order[],
  refunds: Order[],
  intervals: Date[],
): MetricData[] => {
  let currentInventory = calculateInventoryLevels(products, intervals[0])

  return intervals.map((interval) => {
    const ordersSinceLastInterval = orders.filter(
      (order) =>
        new Date(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE)) <= interval &&
        new Date(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE)) > intervals[0],
    )
    const refundsSinceLastInterval = refunds.filter(
      (refund) =>
        new Date(utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE)) <= interval &&
        new Date(utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE)) > intervals[0],
    )

    // Decrease inventory for orders
    ordersSinceLastInterval.forEach((order) => {
      order.line_items?.forEach((item) => {
        currentInventory -= item.quantity || 0
      })
    })

    // Increase inventory for refunds
    refundsSinceLastInterval.forEach((refund) => {
      refund.line_items?.forEach((item) => {
        currentInventory += item.quantity || 0
      })
    })

    return {
      date: format(interval, "yyyy-MM-dd"),
      value: currentInventory,
    }
  })
}

function formatInTimeZone(date: Date, timeZone: string, formatStr: string): string {
  const zonedDate = utcToZonedTime(date, timeZone)
  return format(zonedDate, formatStr)
}

type DateRangeWithStartEnd = {
  start: Date
  end: Date
}


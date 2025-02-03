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
  subDays,
} from "date-fns"
import { utcToZonedTime as originalUtcToZonedTime, toDate } from "date-fns-tz"

// Fallback implementation of utcToZonedTime
const utcToZonedTime = (date: Date | number, timeZone: string): Date => {
  if (typeof originalUtcToZonedTime === "function") {
    return originalUtcToZonedTime(date, timeZone)
  }
  console.warn("utcToZonedTime from date-fns-tz is not available. Using fallback implementation.")
  return new Date(date)
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
      start: toDate(startOfZonedDay, { timeZone: SHOPIFY_TIMEZONE }),
      end: toDate(endOfZonedDay, { timeZone: SHOPIFY_TIMEZONE }),
    }
  }

  // Convert back to UTC for storage
  return {
    start: toDate(startOfDay(zonedStart), { timeZone: SHOPIFY_TIMEZONE }),
    end: toDate(endOfDay(zonedEnd), { timeZone: SHOPIFY_TIMEZONE }),
  }
}

// Update the generateSalesData function to handle dates correctly
const generateSalesData = (orders: Order[], refunds: Order[], range: DateRangeWithStartEnd) => {
  // Convert range to Shopify's timezone
  const zonedStart = utcToZonedTime(range.start, SHOPIFY_TIMEZONE)
  const zonedEnd = utcToZonedTime(range.end, SHOPIFY_TIMEZONE)
  const isSingleDay = isSameDay(zonedStart, zonedEnd)

  // Create intervals based on whether it's a single day or multiple days
  const intervals = isSingleDay
    ? Array.from({ length: 24 }, (_, i) => {
        const date = new Date(zonedStart)
        date.setHours(i, 0, 0, 0)
        return date
      })
    : eachDayOfInterval({ start: zonedStart, end: zonedEnd })

  // Initialize sales data with zero values for all intervals
  const sales = intervals.reduce(
    (acc, interval) => {
      const key = isSingleDay ? format(interval, "HH:00") : format(interval, "yyyy-MM-dd")
      acc[key] = {
        value: 0,
        ordersPlaced: 0,
        unitsSold: 0,
      }
      return acc
    },
    {} as Record<string, { value: number; ordersPlaced: number; unitsSold: number }>,
  )

  // Add sales data from orders
  orders.forEach((order) => {
    const orderDate = utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE)

    if (isValid(orderDate) && isWithinInterval(orderDate, { start: zonedStart, end: zonedEnd })) {
      const key = isSingleDay ? format(orderDate, "HH:00") : format(orderDate, "yyyy-MM-dd")

      if (key in sales) {
        // Check if order is fully refunded
        const isFullyRefunded = refunds.some(
          (refund) => refund.order_id === order.id && Number(refund.total_price) >= Number(order.total_price),
        )

        if (!isFullyRefunded) {
          const orderTotal = Number(order.total_price || 0)
          sales[key].value += orderTotal
          sales[key].ordersPlaced += 1
          sales[key].unitsSold += order.line_items.reduce((sum, item) => sum + item.quantity, 0)
        }
      }
    }
  })

  // Subtract refunds from sales data
  refunds.forEach((refund) => {
    const refundDate = utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE)

    if (isValid(refundDate) && isWithinInterval(refundDate, { start: zonedStart, end: zonedEnd })) {
      const key = isSingleDay ? format(refundDate, "HH:00") : format(refundDate, "yyyy-MM-dd")

      if (key in sales) {
        sales[key].value -= Number(refund.total_price || 0)
      }
    }
  })

  // Convert to array format and ensure correct date ordering
  return intervals.map((interval) => {
    const key = isSingleDay ? format(interval, "HH:00") : format(interval, "yyyy-MM-dd")
    return {
      date: key,
      value: sales[key].value,
      ordersPlaced: sales[key].ordersPlaced,
      unitsSold: sales[key].unitsSold,
    }
  })
}

const generateHourlyData = (start: Date, end: Date, dataFn: (hour: Date) => number): MetricData[] => {
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
  comparisonType: ComparisonType = "none",
  comparisonDateRange?: DateRange,
): Metrics {
  const defaultMetrics: Metrics = {
    totalSales: 0,
    salesGrowth: 0,
    averageOrderValue: 0,
    aovGrowth: 0,
    salesData: [],
    ordersPlaced: 0,
    previousOrdersPlaced: 0,
    unitsSold: 0,
    previousUnitsSold: 0,
    orderCount: 0,
    previousOrderCount: 0,
    topProducts: [],
    customerRetentionRate: 0,
    revenueByDay: Array(7).fill(0),
    sessionCount: 0,
    sessionGrowth: 0,
    sessionData: [],
    conversionRate: 0,
    conversionRateGrowth: 0,
    conversionData: [],
    retentionRateGrowth: 0,
    retentionData: [],
    currentWeekRevenue: Array(7).fill(0),
    inventoryLevels: 0,
    returnRate: 0,
    inventoryData: [],
    returnData: [],
    categoryPerformance: [],
    customerSegments: {
      newCustomers: 0,
      returningCustomers: 0,
    },
    customerLifetimeValue: 0,
    clvData: [],
    averageTimeToFirstPurchase: 0,
    timeToFirstPurchaseData: [],
    // Add the missing properties
    categoryData: [],
    shippingZones: [],
    shippingData: [],
    paymentMethods: [],
    paymentData: [],
    discountPerformance: [],
    discountData: [],
    firstTimeVsReturning: {
      firstTime: { orders: 0, revenue: 0 },
      returning: { orders: 0, revenue: 0 },
    },
    customerSegmentData: [],
  }

  if (!Array.isArray(orders) || orders.length === 0 || !dateRange?.from || !dateRange?.to) {
    return defaultMetrics
  }

  const currentRange = ensureValidDateRange(dateRange.from, dateRange.to)
  const isSingleDay = isSameDay(
    utcToZonedTime(currentRange.start, SHOPIFY_TIMEZONE),
    utcToZonedTime(currentRange.end, SHOPIFY_TIMEZONE),
  )

  // Adjust the date range to shift sales data forward by one day
  const adjustedCurrentRange = {
    start: subDays(currentRange.start, 1),
    end: subDays(currentRange.end, 1),
  }

  // Filter orders and refunds by adjusted date range
  const filteredOrders = orders.filter((order) => {
    const orderDate = utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE)
    return isValid(orderDate) && isWithinInterval(orderDate, adjustedCurrentRange)
  })

  const filteredRefunds = refunds.filter((refund) => {
    const refundDate = utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE)
    return isValid(refundDate) && isWithinInterval(refundDate, adjustedCurrentRange)
  })

  // Calculate total sales with refunds subtracted
  const totalSales = filteredOrders.reduce((sum, order) => {
    const orderTotal = Number(order.total_price || 0)
    const orderRefunds = filteredRefunds
      .filter((refund) => refund.order_id === order.id)
      .reduce((refundSum, refund) => refundSum + Number(refund.total_price || 0), 0)
    console.log(`Order ${order.id}: Total: ${orderTotal}, Refunds: ${orderRefunds}`)
    return sum + orderTotal - orderRefunds
  }, 0)

  console.log("Total sales after refunds:", totalSales)

  // Calculate total refunded amount
  const totalRefunds = filteredRefunds.reduce((sum, refund) => sum + Number(refund.total_price || 0), 0)
  console.log("Total refunds amount:", totalRefunds)

  console.log("Total number of refunds:", refunds.length)
  console.log("Number of filtered refunds:", filteredRefunds.length)

  // Generate intervals (shift dates forward by one day)
  const intervals = isSingleDay
    ? Array.from({ length: 24 }, (_, i) => {
        const date = addDays(new Date(utcToZonedTime(adjustedCurrentRange.start, SHOPIFY_TIMEZONE)), 1)
        date.setHours(i, 0, 0, 0)
        return date
      })
    : eachDayOfInterval(adjustedCurrentRange).map((date) => addDays(date, 1))

  // Generate sales data with refunds considered and dates shifted
  const salesData = intervals.map((interval) => {
    const key = isSingleDay ? format(interval, "HH:00") : format(interval, "yyyy-MM-dd")
    const periodOrders = filteredOrders.filter((order) => {
      const orderDate = addDays(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE), 1)
      return isSingleDay ? format(orderDate, "HH:00") === key : format(orderDate, "yyyy-MM-dd") === key
    })
    const periodRefunds = filteredRefunds.filter((refund) => {
      const refundDate = addDays(utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE), 1)
      return isSingleDay ? format(refundDate, "HH:00") === key : format(refundDate, "yyyy-MM-dd") === key
    })

    const dailySales = periodOrders.reduce((sum, order) => sum + Number(order.total_price || 0), 0)
    const dailyRefunds = periodRefunds.reduce((sum, refund) => sum + Number(refund.total_price || 0), 0)
    const netSales = dailySales - dailyRefunds

    console.log(`Date ${key}: Sales: ${dailySales}, Refunds: ${dailyRefunds}, Net: ${netSales}`)

    const dailyUnitsSold = periodOrders.reduce(
      (sum, order) => sum + (order.line_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0),
      0,
    )
    const dailyUnitsRefunded = periodRefunds.reduce(
      (sum, refund) => sum + (refund.line_items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0),
      0,
    )
    const netUnitsSold = dailyUnitsSold - dailyUnitsRefunded

    return {
      date: key,
      value: netSales,
      ordersPlaced: periodOrders.length,
      unitsSold: netUnitsSold,
    }
  })

  console.log("Sales data after processing:", salesData)

  // Generate conversion rate data
  const conversionData = intervals.map((interval) => {
    const key = isSingleDay ? format(interval, "HH:00") : format(interval, "yyyy-MM-dd")
    const periodOrders = filteredOrders.filter((order) => {
      const orderDate = addDays(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE), 1)
      return isSingleDay ? format(orderDate, "HH:00") === key : format(orderDate, "yyyy-MM-dd") === key
    })
    // Simulate session data - replace with real data when available
    const sessions = Math.floor(Math.random() * 100) + periodOrders.length
    return {
      date: key,
      value: sessions > 0 ? (periodOrders.length / sessions) * 100 : 0,
    }
  })

  // Generate retention rate data
  const retentionData = intervals.map((interval) => {
    const key = isSingleDay ? format(interval, "HH:00") : format(interval, "yyyy-MM-dd")
    const periodOrders = filteredOrders.filter((order) => {
      const orderDate = addDays(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE), 1)
      return isSingleDay ? format(orderDate, "HH:00") === key : format(orderDate, "yyyy-MM-dd") === key
    })

    const uniqueCustomers = new Set(periodOrders.map((order) => order.customer?.id).filter(Boolean))
    const returningCustomers = new Set(
      periodOrders
        .filter((order) => {
          const customerOrders = filteredOrders.filter((o) => o.customer?.id === order.customer?.id)
          return customerOrders.length > 1
        })
        .map((order) => order.customer?.id)
        .filter(Boolean),
    )

    return {
      date: key,
      value: uniqueCustomers.size > 0 ? (returningCustomers.size / uniqueCustomers.size) * 100 : 0,
    }
  })

  // Generate inventory levels data
  const inventoryData = generateInventoryData(products, filteredOrders, filteredRefunds, intervals)
  const inventoryLevels = inventoryData[inventoryData.length - 1].value

  // Generate return rate data
  const returnData = intervals.map((interval) => {
    const key = isSingleDay ? format(interval, "HH:00") : format(interval, "yyyy-MM-dd")
    const periodOrders = filteredOrders.filter((order) => {
      const orderDate = addDays(utcToZonedTime(parseISO(order.created_at), SHOPIFY_TIMEZONE), 1)
      return isSingleDay ? format(orderDate, "HH:00") === key : format(orderDate, "yyyy-MM-dd") === key
    })
    const periodRefunds = filteredRefunds.filter((refund) => {
      const refundDate = addDays(utcToZonedTime(parseISO(refund.created_at), SHOPIFY_TIMEZONE), 1)
      return isSingleDay ? format(refundDate, "HH:00") === key : format(refundDate, "yyyy-MM-dd") === key
    })

    return {
      date: key,
      value: periodOrders.length > 0 ? (periodRefunds.length / periodOrders.length) * 100 : 0,
    }
  })

  // Calculate other metrics
  const ordersPlaced = filteredOrders.length
  const averageOrderValue = ordersPlaced > 0 ? totalSales / ordersPlaced : 0
  const unitsSold = salesData.reduce((sum, day) => sum + day.unitsSold, 0)

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
    averageOrderValue,
    salesData,
    ordersPlaced,
    unitsSold,
    orderCount: ordersPlaced,
    topProducts: calculateTopProducts(filteredOrders, filteredRefunds),
    customerRetentionRate: calculateCustomerRetentionRate(filteredOrders),
    revenueByDay: calculateRevenueByDay(filteredOrders, filteredRefunds),
    conversionRate: calculateOverallConversionRate(filteredOrders),
    conversionData,
    retentionData,
    currentWeekRevenue, // This is now always the current week's data
    inventoryLevels,
    returnRate: calculateReturnRate(filteredOrders, filteredRefunds),
    inventoryData,
    returnData,
    // Add placeholder values for the new properties
    categoryData: [],
    shippingZones: [],
    shippingData: [],
    paymentMethods: [],
    paymentData: [],
    discountPerformance: [],
    discountData: [],
    firstTimeVsReturning: {
      firstTime: { orders: 0, revenue: 0 },
      returning: { orders: 0, revenue: 0 },
    },
    customerSegmentData,
    categoryPerformance,
    customerSegments,
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


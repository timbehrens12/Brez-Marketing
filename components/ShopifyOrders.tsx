"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCcw, Loader2, AlertCircle, Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://my-campaign-manager-8170707a798c.herokuapp.com"

interface LineItem {
  id: number
  name: string
  quantity: number
  price: string
}

interface Order {
  id: number
  name: string
  created_at: string
  total_price: string
  currency: string
  line_items: LineItem[]
  fulfillment_status: string | null
}

type FulfillmentStatus = "all" | "unfulfilled" | "fulfilled"

interface ShopifyOrdersProps {
  selectedStore: string | null
}

export function ShopifyOrders({ selectedStore }: ShopifyOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [needsReauth, setNeedsReauth] = useState(false)
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentStatus>("all")

  async function fetchOrders() {
    if (!selectedStore) {
      setError("No store selected. Please select a store.")
      setLoading(false)
      return
    }

    try {
      setRefreshing(true)
      console.log("Fetching orders for store:", selectedStore)
      const response = await fetch(`${API_URL}/api/shopify/sales?shop=${encodeURIComponent(selectedStore)}`)

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.needsReauth) {
          setNeedsReauth(true)
          throw new Error("Authentication expired. Please re-authenticate.")
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`)
      }

      const data = await response.json()
      console.log("Received orders data:", data)

      if (!data.orders) {
        throw new Error("No orders data received")
      }

      setOrders(data.orders)
      setError(null)
      setNeedsReauth(false)
    } catch (err) {
      console.error("Error fetching orders:", err)
      setError(`${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (selectedStore) {
      fetchOrders()
    } else {
      setLoading(false)
      setError("No store selected. Please select a store.")
    }
  }, [selectedStore])

  function handleReauth() {
    if (selectedStore) {
      window.location.href = `${API_URL}/shopify/auth?shop=${encodeURIComponent(selectedStore)}`
    }
  }

  function handleAddStore() {
    const newStore = prompt("Enter the URL of your Shopify store (e.g., mystore.myshopify.com):")
    if (newStore) {
      const shopUrl = newStore.includes(".myshopify.com") ? newStore : `${newStore}.myshopify.com`
      window.location.href = `${API_URL}/shopify/auth?shop=${encodeURIComponent(shopUrl)}`
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (fulfillmentFilter === "all") return true
    if (fulfillmentFilter === "unfulfilled") return order.fulfillment_status === null
    if (fulfillmentFilter === "fulfilled") return order.fulfillment_status === "fulfilled"
    return true
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Recent Shopify Orders</CardTitle>
          <div className="flex items-center gap-4">
            <Button onClick={handleAddStore} variant="outline" size="sm">
              <Store className="mr-2 h-4 w-4" />
              Add Store
            </Button>
            <Select value={fulfillmentFilter} onValueChange={(value: FulfillmentStatus) => setFulfillmentFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOrders}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {needsReauth && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Authentication expired for {selectedStore}. Please{" "}
              <button onClick={handleReauth} className="underline font-medium hover:text-destructive-foreground">
                re-authenticate
              </button>
              .
            </AlertDescription>
          </Alert>
        )}

        {filteredOrders.length === 0 ? (
          <div className="text-center text-muted-foreground">No orders found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.name}</TableCell>
                  <TableCell>{format(new Date(order.created_at), "PPP")}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.fulfillment_status === "fulfilled"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.fulfillment_status
                        ? order.fulfillment_status.charAt(0).toUpperCase() + order.fulfillment_status.slice(1)
                        : "Unfulfilled"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: order.currency,
                    }).format(Number(order.total_price))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}


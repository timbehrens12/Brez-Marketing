"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Order {
  id: number
  name: string
  created_at: string
  total_price: string
  currency: string
  line_items: Array<{
    id: number
    name: string
    quantity: number
    price: string
  }>
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch("http://localhost:3001/api/shopify/sales")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setOrders(data.orders)
      } catch (err) {
        console.error("Error fetching orders:", err)
        setError(`Error fetching orders: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  if (loading) return <div className="text-center p-4">Loading orders...</div>
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Recent Orders</h1>
      {orders.map((order) => (
        <Card key={order.id} className="mb-4">
          <CardHeader>
            <CardTitle>{order.name}</CardTitle>
            <CardDescription>Created on {new Date(order.created_at).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-2">
              Total: {order.total_price} {order.currency}
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.line_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}


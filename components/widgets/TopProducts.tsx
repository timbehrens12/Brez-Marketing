"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const topProducts = [
  { name: "Product A", sales: 120, revenue: 1200 },
  { name: "Product B", sales: 80, revenue: 960 },
  { name: "Product C", sales: 60, revenue: 720 },
  { name: "Product D", sales: 40, revenue: 600 },
  { name: "Product E", sales: 20, revenue: 400 },
]

export function TopProducts() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Sales</TableHead>
              <TableHead>Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProducts.map((product) => (
              <TableRow key={product.name}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.sales}</TableCell>
                <TableCell>${product.revenue}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


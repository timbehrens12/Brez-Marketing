"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Product {
  name: string
  quantity: number
  revenue: number
}

interface TopProductsProps {
  products: Product[]
}

export function TopProducts({ products = [] as Product[] }) {
  if (!products.length) {
    return (
      <div className="bg-[#111111] p-4 rounded-lg">
        <h3 className="text-sm font-medium mb-4">Top Products</h3>
        <div className="text-center text-gray-500 py-4">
          No products data available
        </div>
      </div>
    )
  }
  return (
    <Card className="bg-[#111111] border-[#222222]">
      <CardHeader>
        <CardTitle className="text-lg font-medium text-white">Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-white">Product</TableHead>
              <TableHead className="text-white text-right">Quantity</TableHead>
              <TableHead className="text-white text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products as Product[]).slice(0, 3).map((product) => (
              <TableRow key={product.name}>
                <TableCell className="font-medium text-white">{product.name}</TableCell>
                <TableCell className="text-white text-right">{product.quantity}</TableCell>
                <TableCell className="text-emerald-500 text-right">${product.revenue.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


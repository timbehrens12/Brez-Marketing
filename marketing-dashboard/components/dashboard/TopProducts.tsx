"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

interface TopProductsProps {
  products: TopProduct[]
}

export function TopProducts({ products }: TopProductsProps) {
  return (
    <Card className="col-span-1 md:col-span-2 xl:col-span-1 bg-gray-100 border-gray-300">
      <CardHeader>
        <CardTitle className="text-gray-800">Top Selling Products</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-gray-600">Product</TableHead>
              <TableHead className="text-gray-600">Quantity</TableHead>
              <TableHead className="text-gray-600">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.slice(0, 3).map((product) => (
              <TableRow key={product.name}>
                <TableCell className="font-medium text-gray-700">{product.name}</TableCell>
                <TableCell className="text-gray-700">{product.quantity}</TableCell>
                <TableCell className="text-gray-700">${product.revenue.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


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
    <Card className="bg-gray-300 border-black">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Top Products</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-black">Product</TableHead>
              <TableHead className="text-black text-right">Quantity</TableHead>
              <TableHead className="text-black text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.slice(0, 3).map((product) => (
              <TableRow key={product.name}>
                <TableCell className="font-medium text-black">{product.name}</TableCell>
                <TableCell className="text-black text-right">{product.quantity}</TableCell>
                <TableCell className="text-black text-right">${product.revenue.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CategoryPerformance } from "@/types/metrics"

interface CategoryPerformanceProps {
  categories?: CategoryPerformance[] // Make categories optional
}

export function CategoryPerformanceWidget({ categories = [] }: CategoryPerformanceProps) {
  // Add default empty array
  if (!categories || categories.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No category data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.name}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-right">${category.revenue.toLocaleString()}</TableCell>
                <TableCell className="text-right">{category.orders}</TableCell>
                <TableCell className="text-right">{category.units}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


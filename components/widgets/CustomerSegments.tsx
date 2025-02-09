"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface CustomerSegmentsProps {
  segments: {
    newCustomers: number
    returningCustomers: number
  }
}

const COLORS = {
  newCustomers: "#3b82f6", // Blue to match the legend
  returningCustomers: "#22c55e", // Green to match the legend
}

export function CustomerSegmentsWidget({ segments }: CustomerSegmentsProps) {
  // Handle empty or zero-value data
  const total = segments.newCustomers + segments.returningCustomers
  if (total === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No customer data available</p>
        </CardContent>
      </Card>
    )
  }

  const data = [
    {
      name: "New Customers",
      value: segments.newCustomers,
      color: COLORS.newCustomers,
    },
    {
      name: "Returning Customers",
      value: segments.returningCustomers,
      color: COLORS.returningCustomers,
    },
  ].filter((segment) => segment.value > 0) // Only show segments with values

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Customer Segments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} />
              <Tooltip
                formatter={(value: number) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, "Customers"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}


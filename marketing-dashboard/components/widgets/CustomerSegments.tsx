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
  newCustomers: "#3b82f6",
  returningCustomers: "#22c55e",
}

export function CustomerSegmentsWidget({ segments }: CustomerSegmentsProps) {
  const total = segments.newCustomers + segments.returningCustomers
  if (total === 0) {
    return (
      <Card className="col-span-2 bg-gray-100 border-gray-300">
        <CardHeader>
          <CardTitle className="text-gray-800">Customer Segments</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-gray-500">No customer data available</p>
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
  ].filter((segment) => segment.value > 0)

  return (
    <Card className="col-span-2 bg-gray-50 border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-800">Customer Segments</CardTitle>
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
                contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "6px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}


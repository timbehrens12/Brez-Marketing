"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface CustomerSegmentsProps {
  segments: {
    newCustomers: number;
    returningCustomers: number;
  }
}

const COLORS = {
  newCustomers: "#3b82f6",
  returningCustomers: "#22c55e",
}

export function CustomerSegmentsWidget({ 
  segments = { newCustomers: 0, returningCustomers: 0 } 
}: CustomerSegmentsProps) {
  const data = [
    {
      name: "New Customers",
      value: segments.newCustomers,
      color: "#2563eb"
    },
    {
      name: "Returning Customers",
      value: segments.returningCustomers,
      color: "#16a34a"
    }
  ]

  return (
    <Card className="bg-[#111111] border-[#222222]">
      <CardHeader>
        <CardTitle className="text-white">Customer Segments</CardTitle>
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
                formatter={(value: number) => [
                  `${value} (${((value / (segments.newCustomers + segments.returningCustomers)) * 100).toFixed(1)}%)`,
                  "Customers"
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CustomerSegmentsWidgetProps {
  segments: Array<{
    name: string;
    value: number;
  }>;
}

export function CustomerSegmentsWidget({ segments }: CustomerSegmentsWidgetProps) {
  return (
    <Card className="bg-[#111111] border-[#222222]">
      <CardHeader>
        <CardTitle className="text-white">Customer Segments</CardTitle>
      </CardHeader>
      <CardContent>
        {segments.map(segment => (
          <div key={segment.name} className="flex justify-between items-center mb-2">
            <span className="text-gray-300">{segment.name}</span>
            <span className="text-white">{segment.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 
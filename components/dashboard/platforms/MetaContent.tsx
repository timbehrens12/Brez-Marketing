"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { TabsContent } from "@/components/ui/tabs"
import { useWidgets } from "@/context/WidgetContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function MetaContent() {
  const { widgets } = useWidgets()
  const metaWidgets = widgets.filter((w) => w.platform === "Meta Ads" && w.isEnabled && !w.isPinned)

  if (metaWidgets.length === 0) {
    return (
      <TabsContent value="meta">
        <Card>
          <CardHeader>
            <CardTitle>Meta Ads Integration</CardTitle>
            <CardDescription>Connect your Meta Ads account to view metrics</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
            <p className="text-center text-muted-foreground">
              Your Meta Ads account is not connected. Connect your account to view performance metrics and manage your
              campaigns.
            </p>
            <Button className="mt-4">
              Connect Meta Ads
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    )
  }

  return (
    <TabsContent value="meta">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metaWidgets.map((widget) => (
          <MetricCard key={widget.id} title={widget.name} value={0} change={0} data={[]} platform="Meta Ads" />
        ))}
      </div>
    </TabsContent>
  )
}


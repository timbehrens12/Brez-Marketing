"use client"

import { TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

interface PlatformContentProps {
  platform: string
  value: string
}

export function PlatformContent({ platform, value }: PlatformContentProps) {
  return (
    <TabsContent value={value} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{platform} Integration</CardTitle>
          <CardDescription>Connect your {platform} account to view metrics</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <p className="text-center text-muted-foreground">
            Your {platform} account is not connected. Connect your account to view performance metrics and manage your
            campaigns.
          </p>
          <Button className="mt-4">
            Connect {platform}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </TabsContent>
  )
}


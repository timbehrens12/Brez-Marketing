interface PlatformTabsProps {
  platforms: {
    shopify: boolean
    meta: boolean
  }
  dateRange: DateRange
  metrics: any
  isLoading: boolean
  data?: any
}

export function PlatformTabs({ platforms, dateRange, metrics, isLoading, data }: PlatformTabsProps) {
  return (
    <TabsList>
      {platforms.shopify && (
        <TabsTrigger value="shopify">
          <ShopifyTab 
            data={data?.shopify} 
            dateRange={dateRange}
            metrics={metrics}
            isLoading={isLoading}
          />
        </TabsTrigger>
      )}
      {platforms.meta && (
        <TabsTrigger value="meta">
          <MetaTab 
            data={data?.meta}
            dateRange={dateRange}
            metrics={metrics}
            isLoading={isLoading}
          />
        </TabsTrigger>
      )}
    </TabsList>
  )
} 
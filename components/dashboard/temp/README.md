# AI Dashboard Analysis Integration

This folder contains a standalone component that demonstrates how to integrate AI-generated analysis into the dashboard using OpenAI. The component can be used directly or as a reference for integrating similar functionality into the GreetingWidget.

## How to Use This Component

To use the `AIDashboardAnalysis` component directly in your dashboard:

```tsx
import { AIDashboardAnalysis } from '@/components/dashboard/temp/AIDashboardAnalysis';

// Then within your component:
<AIDashboardAnalysis 
  brandId={brandId}
  period="daily" // or "monthly"
  metrics={{
    totalSales: dailyReport.revenueGenerated,
    ordersCount: dailyReport.totalPurchases,
    averageOrderValue: dailyReport.revenueGenerated / dailyReport.totalPurchases,
    adSpend: dailyReport.totalAdSpend,
    roas: dailyReport.averageRoas
  }}
  comparison={{
    salesGrowth: dailyReport.periodComparison.salesGrowth,
    orderGrowth: dailyReport.periodComparison.orderGrowth,
    roasGrowth: dailyReport.periodComparison.roasGrowth,
    adSpendGrowth: dailyReport.periodComparison.adSpendGrowth
  }}
  bestSellingProducts={dailyReport.bestSellingProducts}
  recommendations={dailyReport.recommendations}
/>
```

## Integration Steps for GreetingWidget

To integrate the AI analysis functionality directly into the GreetingWidget:

1. **Add required imports**:
   ```tsx
   import { getGPT4Response } from '@/lib/openai';
   import { Loader2 } from 'lucide-react';
   ```

2. **Add state variables** to the GreetingWidget component:
   ```tsx
   const [dailyAiAnalysis, setDailyAiAnalysis] = useState<string>('');
   const [monthlyAiAnalysis, setMonthlyAiAnalysis] = useState<string>('');
   const [isLoadingDailyAnalysis, setIsLoadingDailyAnalysis] = useState<boolean>(false);
   const [isLoadingMonthlyAnalysis, setIsLoadingMonthlyAnalysis] = useState<boolean>(false);
   ```

3. **Create a generateRealAIAnalysis function** outside the component:
   ```tsx
   const generateRealAIAnalysis = async (
     period: ReportPeriod,
     metrics: PeriodMetrics,
     comparison: {
       salesGrowth: number,
       orderGrowth: number,
       customerGrowth: number,
       roasGrowth: number,
       conversionGrowth: number,
       adSpendGrowth: number
     },
     bestSellingProducts?: Array<{
       name: string;
       revenue: number;
       orders: number;
     }>,
     platformData?: {
       shopifyConnected: boolean;
       metaConnected: boolean;
     }
   ): Promise<string> => {
     // Implementation from AIDashboardAnalysis.tsx
   };
   ```

4. **Update the fetchPeriodData function** to call the AI generation:
   ```tsx
   // Generate AI analysis for daily report
   if (dailyReport && dailyReport.revenueGenerated > 0) {
     setIsLoadingDailyAnalysis(true);
     const platformData = {
       shopifyConnected: !!shopifyConnection,
       metaConnected: !!metaConnection
     };
     
     // Use the getPeriodDates function to get the correct date range
     const { from: dailyFrom, to: dailyTo } = getPeriodDates('daily');
     
     const currentPeriodMetrics = await fetchPeriodMetrics(
       shopifyConnection?.id || '',
       dailyFrom,
       dailyTo
     );
     
     const analysis = await generateRealAIAnalysis(
       'daily', 
       currentPeriodMetrics, 
       dailyReport.periodComparison,
       dailyReport.bestSellingProducts,
       platformData
     );
     
     setDailyAiAnalysis(analysis);
     setIsLoadingDailyAnalysis(false);
   }
   
   // Similar code for monthly report
   ```

5. **Replace the static analysis content** in the JSX with dynamic content:
   ```tsx
   {isLoadingDailyAnalysis ? (
     <div className="flex flex-col items-center justify-center py-4">
       <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-2" />
       <p>Generating analysis...</p>
     </div>
   ) : dailyAiAnalysis ? (
     <div>
       <div className="whitespace-pre-line">{dailyAiAnalysis}</div>
       
       {/* Actionable Recommendations section - Daily view */}
       <div className="mt-6">
         <h6 className="text-blue-400 font-medium flex items-center mb-2">
           <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Recommended Actions
         </h6>
         <ul className="space-y-1.5 pl-5 list-disc">
           {dailyReport.recommendations.map((recommendation, index) => (
             <li key={index}>{recommendation}</li>
           ))}
         </ul>
       </div>
     </div>
   ) : (
     <p>Unable to generate AI analysis at this time. Please try refreshing the page or check back later.</p>
   )}
   ```

## Notes

- This implementation uses the existing OpenAI integration from `lib/openai.ts`
- Error handling is included to show a graceful fallback message if the API call fails
- The AI-generated content preserves formatting with `whitespace-pre-line`
- Loading states are shown while the API call is in progress
- The component will only attempt to generate analysis if there's sufficient data 
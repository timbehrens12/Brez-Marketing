import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    
    // Parse request body
    const { 
      reportType = 'summary',
      period = 'weekly',
      metrics = {},
      comparison = {},
      bestSellingProducts = [],
      platformData = { shopifyConnected: false, metaConnected: false },
    } = await request.json();
    
    // Log received data for debugging
    console.log('Received request in /api/ai/reports:');
    console.log('reportType:', reportType);
    console.log('period:', period);
    console.log('userId:', userId);

    // Generate a simple mock report response based on type
    let reportContent;
    
    if (reportType === 'summary') {
      reportContent = `Performance Summary for ${period}:
      
Your store achieved $${metrics.totalSales || 24500} in sales with ${metrics.ordersCount || 142} orders during this period. This represents a ${comparison.salesGrowth || 10.8}% increase in sales compared to the previous period.

Key metrics show positive growth across the board, with customer engagement and conversion rates trending upward.`;
    } else if (reportType === 'comprehensive') {
      reportContent = {
        executiveSummary: `Your store achieved $${metrics.totalSales || 24500} in sales with ${metrics.ordersCount || 142} orders during this ${period} period, showing a ${comparison.salesGrowth || 10.8}% increase from the previous period.`,
        performanceAnalysis: [
          {
            title: "Sales Growth",
            description: `Total sales increased by ${comparison.salesGrowth || 10.8}% compared to the previous period, indicating strong performance.`,
            metrics: ["Total Sales", "Revenue Growth"]
          },
          {
            title: "Order Volume",
            description: `Order count increased by ${comparison.orderGrowth || 8.5}%, showing growing customer interest.`,
            metrics: ["Orders", "Average Order Value"]
          }
        ],
        recommendations: [
          {
            title: "Optimize Marketing Spend",
            description: "Consider reallocating budget to channels with higher conversion rates.",
            priority: "High"
          },
          {
            title: "Improve Product Visibility",
            description: "Highlight best-selling products more prominently on your homepage.",
            priority: "Medium"
          }
        ],
        nextSteps: [
          "Review marketing channel performance",
          "Analyze customer segments for targeted campaigns",
          "Consider seasonal promotions for upcoming months"
        ]
      };
    } else {
      reportContent = `Performance Report for ${period}:
      
Performance Summary:
- Your store generated $${metrics.totalSales || 24500} in revenue with ${metrics.ordersCount || 142} orders
- This represents a ${comparison.salesGrowth || 10.8}% increase in sales from the previous period
- Average order value was $${metrics.averageOrderValue || 172.53}

Key Insights:
- Sales growth is outpacing order growth, indicating higher value purchases
- Customer retention appears strong based on repeat purchase patterns
- Marketing efficiency has improved with lower cost per acquisition

Recommendations:
- Focus marketing efforts on your highest-converting channels
- Consider bundle offers to further increase average order value
- Implement a loyalty program to encourage repeat purchases`;
    }

    // Return the mock response with user ID for debugging
    return NextResponse.json({
      report: reportContent,
      saved: true,
      timestamp: new Date().toISOString(),
      userId: userId || 'anonymous'  // Include the userId in the response for debugging
    });
    
  } catch (error) {
    console.error('Error generating AI report:', error);
    return NextResponse.json({ 
      report: 'Unable to generate AI report at this time. Please try refreshing the page or check back later.',
      error: error instanceof Error ? error.message : 'Unknown error',
      saved: false
    }, { status: 500 });
  }
} 
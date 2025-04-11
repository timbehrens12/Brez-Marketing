import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

// This is a proxy endpoint to redirect requests from /api/ai-reports to /api/ai/reports
export async function POST(request: NextRequest) {
  try {
    // Get authentication
    const { userId } = auth();
    console.log('User ID in proxy:', userId);

    // Clone the request to get the body
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    
    // Add default required fields if they're missing
    const enhancedBody = {
      reportType: body.reportType || 'summary',
      period: body.period || 'weekly',
      metrics: body.metrics || {
        totalSales: 0,
        ordersCount: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        customerCount: 0
      },
      comparison: body.comparison || {
        salesGrowth: 0,
        orderGrowth: 0
      },
      bestSellingProducts: body.bestSellingProducts || [],
      platformData: body.platformData || { 
        shopifyConnected: false, 
        metaConnected: false 
      },
      dateRange: body.dateRange || {},
      userId: userId || body.userId || 'anonymous', // Include the user ID in the request
      ...body // Keep any other fields from the original request
    };
    
    const apiUrl = new URL('/api/ai/reports', request.url);
    
    console.log('Proxying request to:', apiUrl.toString());
    console.log('Request body:', JSON.stringify(enhancedBody));
    
    // Forward the request to the correct endpoint with enhanced body
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization headers if they exist
        ...(request.headers.get('authorization') 
          ? { 'authorization': request.headers.get('authorization')! } 
          : {}),
        // Forward cookie header for authentication
        ...(request.headers.get('cookie') 
          ? { 'cookie': request.headers.get('cookie')! } 
          : {})
      },
      body: JSON.stringify(enhancedBody)
    });
    
    if (!response.ok) {
      console.error('Error from target endpoint:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      // Return a simplified response with default values
      return NextResponse.json({
        report: "Unable to generate report at this time. Please try again later.",
        error: `Target endpoint returned ${response.status}: ${response.statusText}`
      }, { status: 200 }); // Return 200 to client even if the target failed
    }
    
    // Get the response data
    const data = await response.json();
    
    // Return the response from the actual endpoint
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in proxy endpoint /api/ai-reports:', error);
    
    // Return a user-friendly response rather than an error
    return NextResponse.json({ 
      report: "Unable to generate report at this time. Please try again later.",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }); // Return 200 to the client even in case of error
  }
} 
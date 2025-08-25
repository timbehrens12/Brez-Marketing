import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log('🧪 Testing all widgets for brand:', brandId)

    // Test each widget endpoint
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : 'https://your-domain.com' // Update with your actual domain

    const endpoints = [
      { name: 'Regional Sales', path: 'regional-sales' },
      { name: 'Customer Segments', path: 'customer-segments' },
      { name: 'Repeat Customers', path: 'repeat-customers' },
      { name: 'CLV Analysis', path: 'clv-analysis' }
    ]

    const results = []

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}...`)
        
        const response = await fetch(`${baseUrl}/api/shopify/analytics/${endpoint.path}?brandId=${brandId}`, {
          headers: {
            'Cookie': request.headers.get('Cookie') || '', // Forward auth cookies
          }
        })
        
        const data = await response.json()
        
        if (response.ok && data.success) {
          // Check if widget has meaningful data
          let hasData = false
          let dataCount = 0
          
          if (endpoint.path === 'regional-sales') {
            hasData = data.data?.overview?.totalOrders > 0
            dataCount = data.data?.byCountry?.length || 0
          } else if (endpoint.path === 'customer-segments') {
            hasData = data.data?.overview?.totalCustomers > 0
            dataCount = data.data?.topLocations?.length || 0
          } else if (endpoint.path === 'repeat-customers') {
            hasData = data.data?.overview?.totalCustomers > 0
            dataCount = data.data?.topRepeaters?.length || 0
          } else if (endpoint.path === 'clv-analysis') {
            hasData = data.data?.overview?.totalCustomers > 0
            dataCount = data.data?.topCustomers?.length || 0
          }
          
          results.push({
            name: endpoint.name,
            status: 'success',
            hasData,
            dataCount,
            message: hasData ? `${dataCount} records found` : 'No data available'
          })
        } else {
          results.push({
            name: endpoint.name,
            status: 'error',
            hasData: false,
            dataCount: 0,
            message: data.error || 'Unknown error'
          })
        }
      } catch (error) {
        results.push({
          name: endpoint.name,
          status: 'error',
          hasData: false,
          dataCount: 0,
          message: error instanceof Error ? error.message : 'Network error'
        })
      }
    }

    // Test inventory endpoint
    try {
      console.log('Testing Inventory...')
      const inventoryResponse = await fetch(`${baseUrl}/api/shopify/inventory?brandId=${brandId}`, {
        headers: {
          'Cookie': request.headers.get('Cookie') || '',
        }
      })
      
      const inventoryData = await inventoryResponse.json()
      
      if (inventoryResponse.ok) {
        results.push({
          name: 'Inventory',
          status: 'success',
          hasData: (inventoryData.items?.length || 0) > 0,
          dataCount: inventoryData.items?.length || 0,
          message: `${inventoryData.items?.length || 0} inventory items found`
        })
      } else {
        results.push({
          name: 'Inventory',
          status: 'error',
          hasData: false,
          dataCount: 0,
          message: inventoryData.error || 'Unknown error'
        })
      }
    } catch (error) {
      results.push({
        name: 'Inventory',
        status: 'error',
        hasData: false,
        dataCount: 0,
        message: error instanceof Error ? error.message : 'Network error'
      })
    }

    const successCount = results.filter(r => r.status === 'success' && r.hasData).length
    const totalCount = results.length

    return NextResponse.json({
      success: true,
      summary: {
        totalWidgets: totalCount,
        workingWidgets: successCount,
        successRate: `${Math.round((successCount / totalCount) * 100)}%`
      },
      results
    })

  } catch (error) {
    console.error('Widget test error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

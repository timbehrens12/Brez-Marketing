import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get customer analytics data
    const { data: customerData, error: customerError } = await supabase
      .from('shopify_customer_analytics')
      .select('*')
      .eq('brand_id', brandId)
      .order('total_spent', { ascending: false })

    if (customerError) {
      console.error('Error fetching customer analytics:', customerError)
      return NextResponse.json({ error: 'Failed to fetch customer analytics' }, { status: 500 })
    }

    // Calculate metrics
    const totalCustomers = customerData?.length || 0
    const totalSpent = customerData?.reduce((sum, customer) => sum + parseFloat(customer.total_spent || '0'), 0) || 0
    const averageSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0

    // Marketing consent analysis
    const marketingStats = {
      emailConsent: customerData?.filter(c => c.accepts_marketing).length || 0,
      smsConsent: customerData?.filter(c => c.sms_marketing_consent === 'subscribed').length || 0,
      totalOptedIn: customerData?.filter(c => c.accepts_marketing || c.sms_marketing_consent === 'subscribed').length || 0
    }

    // Customer lifecycle analysis
    const lifecycleStats = {
      new: customerData?.filter(c => c.orders_count === 1).length || 0,
      returning: customerData?.filter(c => c.orders_count > 1 && c.orders_count <= 5).length || 0,
      loyal: customerData?.filter(c => c.orders_count > 5).length || 0
    }

    // Geographic distribution
    const locationStats = {} as Record<string, any>
    customerData?.forEach(customer => {
      const country = customer.country || 'Unknown'
      const province = customer.province || 'Unknown'
      const key = `${country}-${province}`
      
      if (!locationStats[key]) {
        locationStats[key] = {
          country,
          province,
          customerCount: 0,
          totalSpent: 0,
          averageSpent: 0
        }
      }

      locationStats[key].customerCount += 1
      locationStats[key].totalSpent += parseFloat(customer.total_spent || '0')
    })

    // Calculate averages and convert to array
    const locationArray = Object.values(locationStats).map((location: any) => {
      location.averageSpent = location.customerCount > 0 ? location.totalSpent / location.customerCount : 0
      return location
    }).sort((a: any, b: any) => b.totalSpent - a.totalSpent)

    // Top customers
    const topCustomers = customerData?.slice(0, 10).map(customer => ({
      name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
      email: customer.email,
      totalSpent: parseFloat(customer.total_spent || '0'),
      ordersCount: customer.orders_count || 0,
      averageOrderValue: customer.average_order_value || 0,
      location: `${customer.city || ''}, ${customer.province || ''}, ${customer.country || ''}`.replace(/^,\s*|,\s*$/g, ''),
      acceptsMarketing: customer.accepts_marketing
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          acceptsMarketingCount: marketingStats.acceptsMarketing,
          emailMarketingConsentCount: marketingStats.emailConsent,
          smsMarketingConsentCount: marketingStats.smsConsent
        },
        marketingConsentRates: {
          totalCustomers,
          acceptsMarketing: totalCustomers > 0 ? (marketingStats.acceptsMarketing / totalCustomers) * 100 : 0,
          emailSubscribed: totalCustomers > 0 ? (marketingStats.emailConsent / totalCustomers) * 100 : 0,
          smsSubscribed: totalCustomers > 0 ? (marketingStats.smsConsent / totalCustomers) * 100 : 0
        },
        topCustomerLocations: locationArray,
        recentCustomers: topCustomers
      }
    })

  } catch (error) {
    console.error('Customer behavior API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

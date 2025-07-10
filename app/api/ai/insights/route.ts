import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEcommerceInsights } from '@/lib/openai';
import { auth } from '@clerk/nextjs';

interface ShopifyOrder {
  id: string;
  total_price: string;
  created_at: string;
  line_items?: any[];
  [key: string]: any;
}

interface ShopifyCustomer {
  id: string;
  is_returning_customer: boolean;
  [key: string]: any;
}

interface ShopifyInventoryItem {
  id: string;
  inventory_quantity: number;
  [key: string]: any;
}

interface LineItem {
  product_id: string | number;
  title: string;
  quantity: number;
  price: number;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { brandId, focusArea, dateRange } = await request.json();
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 });
    }

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 });
    }

    // Get all connections for this brand
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id, platform_type, shop, status')
      .eq('brand_id', brandId);

    if (connectionsError) {
      return NextResponse.json({ error: 'Failed to fetch platform connections' }, { status: 500 });
    }

    // Initialize data object
    let data: any = {
      platforms: {}
    };
    
    // Track if we have any active connections
    let hasActiveConnections = false;
    
    // Process Shopify connection if available
    const shopifyConnection = connections.find((c: { platform_type: string; status: string }) => 
      c.platform_type === 'shopify' && c.status === 'active'
    );
    if (shopifyConnection) {
      hasActiveConnections = true;
      data.platforms.shopify = { connectionId: shopifyConnection.id };
      
      // Fetch sales data - limit to 50 most recent orders
      if (focusArea === 'overall' || focusArea === 'sales') {
        const { data: salesData, error: salesError } = await supabase
          .from('shopify_orders')
          .select('id, total_price, created_at, line_items')
          .eq('connection_id', shopifyConnection.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!salesError && salesData && salesData.length > 0) {
          data.platforms.shopify.sales = salesData;
          
          // Calculate sales metrics
          const totalSales = salesData.reduce((sum: number, order: ShopifyOrder) => sum + parseFloat(order.total_price || '0'), 0);
          const orderCount = salesData.length;
          const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
          
          data.platforms.shopify.salesMetrics = {
            totalSales,
            orderCount,
            averageOrderValue
          };
        }
      }
      
      // Fetch customer data - limit to 50 customers
      if (focusArea === 'overall' || focusArea === 'customers') {
        const { data: customerData, error: customerError } = await supabase
          .from('shopify_customers')
          .select('id, is_returning_customer, total_spent, orders_count')
          .eq('connection_id', shopifyConnection.id)
          .limit(50);
        
        if (!customerError && customerData && customerData.length > 0) {
          data.platforms.shopify.customers = customerData;
          
          // Calculate customer metrics
          const totalCustomers = customerData.length;
          const returningCustomers = customerData.filter((c: ShopifyCustomer) => c.is_returning_customer).length;
          const newCustomers = totalCustomers - returningCustomers;
          const returningCustomerRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
          
          data.platforms.shopify.customerMetrics = {
            totalCustomers,
            newCustomers,
            returningCustomers,
            returningCustomerRate
          };
        }
      }
      
      // Fetch product data - limit to 30 most recent orders
      if (focusArea === 'overall' || focusArea === 'products') {
        // Get product data from orders
        const { data: orderData, error: orderError } = await supabase
          .from('shopify_orders')
          .select('line_items')
          .eq('connection_id', shopifyConnection.id)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (!orderError && orderData && orderData.length > 0) {
          // Extract and aggregate product data from line items
          const productMap = new Map();
          
          orderData.forEach((order: ShopifyOrder) => {
            const lineItems = order.line_items || [];
            lineItems.forEach((item: LineItem) => {
              const productId = item.product_id?.toString();
              if (productId) {
                if (!productMap.has(productId)) {
                  productMap.set(productId, {
                    id: productId,
                    title: item.title || 'Unknown Product',
                    quantity: 0,
                    revenue: 0
                  });
                }
                
                const product = productMap.get(productId);
                product.quantity += item.quantity || 0;
                product.revenue += (item.price * item.quantity) || 0;
              }
            });
          });
          
          data.platforms.shopify.products = Array.from(productMap.values());
        }
      }
      
      // Fetch inventory data - limit to 50 items
      if (focusArea === 'overall' || focusArea === 'inventory') {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('shopify_inventory')
          .select('id, product_title, inventory_quantity')
          .eq('connection_id', shopifyConnection.id)
          .limit(50);
        
        if (!inventoryError && inventoryData && inventoryData.length > 0) {
          data.platforms.shopify.inventory = inventoryData;
          
          // Calculate inventory metrics
          const totalInventory = inventoryData.reduce((sum: number, item: ShopifyInventoryItem) => sum + (item.inventory_quantity || 0), 0);
          const lowStockItems = inventoryData.filter((item: ShopifyInventoryItem) => (item.inventory_quantity || 0) < 5).length;
          const outOfStockItems = inventoryData.filter((item: ShopifyInventoryItem) => (item.inventory_quantity || 0) === 0).length;
          
          data.platforms.shopify.inventoryMetrics = {
            totalInventory,
            lowStockItems,
            outOfStockItems
          };
        }
      }
      
      // Add store information for context
      data.platforms.shopify.storeInfo = {
        name: brand.name,
        shopDomain: shopifyConnection.shop
      };
    }
    
    // Process Meta connection if available
    const metaConnection = connections.find((c: { platform_type: string; status: string }) => 
      c.platform_type === 'meta' && c.status === 'active'
    );
    if (metaConnection) {
      hasActiveConnections = true;
      data.platforms.meta = { connectionId: metaConnection.id };
      
      // Fetch Meta ad data
      const { data: metaData, error: metaError } = await supabase
        .from('meta_ad_insights')
        .select('*')
        .eq('brand_id', brandId)
        .order('date', { ascending: false })
        .limit(50);
      
      if (!metaError && metaData && metaData.length > 0) {
        data.platforms.meta.adData = metaData;
        
        // Calculate Meta ad metrics
        const totalSpend = metaData.reduce((sum: number, item: any) => sum + (parseFloat(item.spend) || 0), 0);
        const totalImpressions = metaData.reduce((sum: number, item: any) => sum + (parseInt(item.impressions) || 0), 0);
        const totalClicks = metaData.reduce((sum: number, item: any) => sum + (parseInt(item.clicks) || 0), 0);
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
        
        data.platforms.meta.adMetrics = {
          totalSpend,
          totalImpressions,
          totalClicks,
          ctr,
          cpc
        };
      }
    }
    
    // Add date range information
    data.dateRange = dateRange || { from: 'last 30 days', to: 'today' };
    
    // Add brand information
    data.brandInfo = {
      id: brand.id,
      name: brand.name
    };
    
    // Check if we have enough data to generate insights
    const hasData = hasActiveConnections && (
      (data.platforms.shopify?.sales && data.platforms.shopify.sales.length > 0) ||
      (data.platforms.shopify?.customers && data.platforms.shopify.customers.length > 0) ||
      (data.platforms.shopify?.products && data.platforms.shopify.products.length > 0) ||
      (data.platforms.shopify?.inventory && data.platforms.shopify.inventory.length > 0) ||
      (data.platforms.meta?.adData && data.platforms.meta.adData.length > 0)
    );
    
    if (!hasData) {
      return NextResponse.json({
        summary: "Not enough data available to generate insights.",
        insights: [
          {
            title: "Insufficient Data",
            description: "We need more data to generate meaningful insights. Please connect your store and ad accounts, then ensure you have orders, customers, inventory, or ad data."
          }
        ],
        opportunities: [],
        risks: [],
        recommendations: [
          {
            title: "Add More Data",
            description: "Connect your store and ad accounts, then sync your data to enable AI-powered insights."
          }
        ]
      });
    }
    
    // Generate insights using GPT-4
    const insights = await generateEcommerceInsights(data, focusArea);
    
    return NextResponse.json(insights);
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
    
    // Return a user-friendly error response
    return NextResponse.json({
      summary: "We encountered an issue while generating insights.",
      insights: [
        {
          title: "Analysis Interrupted",
          description: "Our AI analysis service is currently experiencing high demand. Please try again in a few minutes."
        }
      ],
      opportunities: [],
      risks: [],
      recommendations: [
        {
          title: "Try Again Later",
          description: "This is a temporary issue. Please try refreshing the insights in a moment."
        }
      ]
    });
  }
} 
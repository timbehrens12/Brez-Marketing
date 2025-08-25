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
      
      // Fetch enhanced sales data with comprehensive fields
      if (focusArea === 'overall' || focusArea === 'sales') {
        let salesQuery = supabase
          .from('shopify_orders')
          .select('*')
          .eq('connection_id', shopifyConnection.id);
        
        // Apply date range filter if provided
        if (dateRange && dateRange.from && dateRange.to) {
          salesQuery = salesQuery
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to);
        }
        
        const { data: salesData, error: salesError } = await salesQuery
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (!salesError && salesData && salesData.length > 0) {
          data.platforms.shopify.sales = salesData;
          
          // Calculate enhanced sales metrics
          const totalSales = salesData.reduce((sum: number, order: any) => sum + parseFloat(order.total_price || '0'), 0);
          const totalDiscounts = salesData.reduce((sum: number, order: any) => sum + parseFloat(order.total_discounts || '0'), 0);
          const totalTax = salesData.reduce((sum: number, order: any) => sum + parseFloat(order.total_tax || '0'), 0);
          const orderCount = salesData.length;
          const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
          const paidOrders = salesData.filter((order: any) => order.financial_status === 'paid').length;
          const conversionRate = orderCount > 0 ? (paidOrders / orderCount) * 100 : 0;
          
          // Fetch inventory items for margin calculation
          const { data: inventoryItems, error: inventoryError } = await supabase
            .from('shopify_inventory_items')
            .select('*')
            .eq('connection_id', shopifyConnection.id);

          // Calculate margin analysis
          let marginAnalysis = null;
          if (!inventoryError && inventoryItems?.length > 0) {
            const inventoryCostMap = new Map();
            inventoryItems.forEach((item: any) => {
              inventoryCostMap.set(item.inventory_item_id, parseFloat(item.cost) || 0);
            });

            let totalCost = 0;
            let totalRevenue = 0;
            let ordersWithMarginData = 0;

            salesData.forEach((order: any) => {
              if (order.line_items && Array.isArray(order.line_items)) {
                let orderHasCostData = false;
                const orderRevenue = parseFloat(order.total_price) || 0;
                totalRevenue += orderRevenue;

                order.line_items.forEach((lineItem: any) => {
                  const inventoryItemId = lineItem.variant?.inventory_item_id;
                  const unitCost = inventoryCostMap.get(inventoryItemId?.toString()) || 0;
                  const quantity = parseInt(lineItem.quantity) || 0;
                  
                  if (unitCost > 0) {
                    totalCost += unitCost * quantity;
                    orderHasCostData = true;
                  }
                });
                
                if (orderHasCostData) {
                  ordersWithMarginData++;
                }
              }
            });

            const averageMargin = totalRevenue > 0 && totalCost > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
            marginAnalysis = {
              totalCost,
              totalProfit: totalRevenue - totalCost,
              averageMargin,
              ordersWithMarginData,
              marginDataCoverage: orderCount > 0 ? (ordersWithMarginData / orderCount) * 100 : 0
            };
          }

          data.platforms.shopify.salesMetrics = {
            totalSales,
            totalDiscounts,
            totalTax,
            orderCount,
            paidOrders,
            averageOrderValue,
            conversionRate,
            discountRate: totalSales > 0 ? (totalDiscounts / totalSales) * 100 : 0,
            marginAnalysis
          };
        }
      }
      
      // Fetch enhanced customer data
      if (focusArea === 'overall' || focusArea === 'customers') {
        let customerQuery = supabase
          .from('shopify_customers')
          .select('*')
          .eq('connection_id', shopifyConnection.id);
        
        // Apply date range filter if provided
        if (dateRange && dateRange.from && dateRange.to) {
          customerQuery = customerQuery
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to);
        }
        
        const { data: customerData, error: customerError } = await customerQuery
          .order('total_spent', { ascending: false })
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
        let productOrderQuery = supabase
          .from('shopify_orders')
          .select('line_items')
          .eq('connection_id', shopifyConnection.id);
        
        // Apply date range filter if provided
        if (dateRange && dateRange.from && dateRange.to) {
          productOrderQuery = productOrderQuery
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to);
        }
        
        const { data: orderData, error: orderError } = await productOrderQuery
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
        
        // Also fetch product catalog data
        const { data: catalogProducts, error: catalogError } = await supabase
          .from('shopify_products_enhanced')
          .select('*')
          .eq('connection_id', shopifyConnection.id)
          .order('created_at', { ascending: false })
          .limit(30);
          
        if (!catalogError && catalogProducts) {
          data.platforms.shopify.catalog = catalogProducts;
        }
      }
      
      // Fetch cart abandonment insights
      if (focusArea === 'overall' || focusArea === 'abandonment') {
        let draftOrderQuery = supabase
          .from('shopify_draft_orders_enhanced')
          .select('*')
          .eq('connection_id', shopifyConnection.id);
        
        // Apply date range filter if provided
        if (dateRange && dateRange.from && dateRange.to) {
          draftOrderQuery = draftOrderQuery
            .gte('created_at', dateRange.from)
            .lte('created_at', dateRange.to);
        }
        
        const { data: draftOrders, error: draftError } = await draftOrderQuery
          .order('created_at', { ascending: false })
          .limit(30);
          
        if (!draftError && draftOrders) {
          data.platforms.shopify.draftOrders = draftOrders;
          
          const totalDrafts = draftOrders.length;
          const abandonedCarts = draftOrders.filter((draft: any) => draft.status !== 'completed').length;
          const abandonmentRate = totalDrafts > 0 ? (abandonedCarts / totalDrafts) * 100 : 0;
          const averageCartValue = totalDrafts > 0 ? 
            draftOrders.reduce((sum: number, draft: any) => sum + parseFloat(draft.total_price || '0'), 0) / totalDrafts : 0;
            
          data.platforms.shopify.abandonmentMetrics = {
            totalDrafts,
            abandonedCarts,
            abandonmentRate,
            averageCartValue
          };
        }
      }
      
      // Fetch discount performance
      if (focusArea === 'overall' || focusArea === 'discounts') {
        const { data: discounts, error: discountError } = await supabase
          .from('shopify_discounts_enhanced')
          .select('*')
          .eq('connection_id', shopifyConnection.id)
          .order('usage_count', { ascending: false })
          .limit(20);
          
        if (!discountError && discounts) {
          data.platforms.shopify.discounts = discounts;
          
          const activeDiscounts = discounts.filter((d: any) => {
            const now = new Date();
            const startDate = d.starts_at ? new Date(d.starts_at) : null;
            const endDate = d.ends_at ? new Date(d.ends_at) : null;
            return (!startDate || startDate <= now) && (!endDate || endDate >= now);
          }).length;
          
          const totalUsage = discounts.reduce((sum: number, d: any) => sum + (d.usage_count || 0), 0);
          
          data.platforms.shopify.discountMetrics = {
            totalDiscounts: discounts.length,
            activeDiscounts,
            totalUsage
          };
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
      
      // Fetch regional sales data for geographic insights
      if (focusArea === 'overall' || focusArea === 'geography' || focusArea === 'regions') {
        const { data: regionalData, error: regionalError } = await supabase
          .from('shopify_sales_by_region')
          .select('*')
          .eq('connection_id', shopifyConnection.id)
          .order('total_sales', { ascending: false })
          .limit(30);
        
        if (!regionalError && regionalData && regionalData.length > 0) {
          data.platforms.shopify.salesByRegion = regionalData;
          
          // Calculate regional metrics
          const totalRegionalSales = regionalData.reduce((sum: number, region: any) => sum + parseFloat(region.total_sales || '0'), 0);
          const topRegion = regionalData[0];
          const regionCount = regionalData.length;
          
          data.platforms.shopify.regionalMetrics = {
            totalRegionalSales,
            topRegion: topRegion ? {
              name: topRegion.region,
              sales: parseFloat(topRegion.total_sales || '0'),
              orders: topRegion.total_orders || 0
            } : null,
            regionCount
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

        // Add demographic and device insights
        const { data: demographics } = await supabase
          .from('meta_demographics')
          .select('*')
          .eq('connection_id', metaConnection.id)
          .order('impressions', { ascending: false })
          .limit(10);

        const { data: deviceData } = await supabase
          .from('meta_device_performance')
          .select('*')
          .eq('connection_id', metaConnection.id)
          .order('impressions', { ascending: false })
          .limit(10);

        if (demographics?.length > 0 || deviceData?.length > 0) {
          data.platforms.meta.demographics = {
            age: demographics?.filter(d => d.breakdown_type === 'age') || [],
            gender: demographics?.filter(d => d.breakdown_type === 'gender') || [],
            devices: deviceData?.filter(d => d.breakdown_type === 'device') || [],
            placements: deviceData?.filter(d => d.breakdown_type === 'placement') || []
          };
        }
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
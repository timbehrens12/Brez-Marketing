import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGPT4Response } from '@/lib/openai';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Enhanced authentication and rate limiting
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔒 SECURITY: Rate limiting for AI operations
    const { rateLimiter } = await import('@/lib/rate-limiter')
    const rateLimitResult = await rateLimiter.limit(
      `ai-recommendations:${userId}`,
      { interval: 300, limit: 5 } // 5 AI recommendations per 5 minutes
    )
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded for AI recommendations',
          retryAfter: rateLimitResult.retryAfter
        }, 
        { status: 429 }
      )
    }

    // 🔒 SECURITY: Input validation and sanitization
    const body = await request.json();
    const { brandId, area } = body;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!brandId || !uuidRegex.test(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 });
    }
    
    // Sanitize area input
    const sanitizedArea = typeof area === 'string' ? 
      area.trim().slice(0, 100).replace(/[<>\"'&]/g, '') : 
      'general';

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

    // Get connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id, shop')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No Shopify connection found for this brand' }, { status: 404 });
    }

    // Fetch data needed for recommendations
    let data: any = {};
    
    // Get enhanced orders data with comprehensive fields
    const { data: recentOrders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!ordersError) {
      data.recentOrders = recentOrders;
    }
    
    // Get enhanced customer data
    const { data: customers, error: customersError } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('connection_id', connection.id)
      .order('total_spent', { ascending: false })
      .limit(50);
      
    if (!customersError) {
      data.customers = customers;
    }
    
    // Get product performance data
    const { data: products, error: productsError } = await supabase
      .from('shopify_products_enhanced')
      .select('*')
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!productsError) {
      data.products = products;
    }
    
    // Get discount performance data
    const { data: discounts, error: discountsError } = await supabase
      .from('shopify_discounts_enhanced')
      .select('*')
      .eq('connection_id', connection.id)
      .order('usage_count', { ascending: false })
      .limit(20);
      
    if (!discountsError) {
      data.discounts = discounts;
    }
    
    // Get regional sales data
    const { data: regionalSales, error: regionalSalesError } = await supabase
      .from('shopify_sales_by_region')
      .select('*')
      .eq('connection_id', connection.id)
      .order('total_sales', { ascending: false })
      .limit(20);
      
    if (!regionalSalesError) {
      data.regionalSales = regionalSales;
    }
    
    // Get cart abandonment insights
    const { data: draftOrders, error: draftOrdersError } = await supabase
      .from('shopify_draft_orders_enhanced')
      .select('*')
      .eq('connection_id', connection.id)
      .order('total_price', { ascending: false })
      .limit(30);
      
    if (!draftOrdersError) {
      data.draftOrders = draftOrders;
    }

    // Get inventory items for margin calculation
    const { data: inventoryItems, error: inventoryItemsError } = await supabase
      .from('shopify_inventory_items')
      .select('*')
      .eq('brand_id', brandId);

    // Calculate margin analysis
    if (!inventoryItemsError && inventoryItems?.length > 0 && recentOrders?.length > 0) {
      const inventoryCostMap = new Map();
      inventoryItems.forEach((item: any) => {
        inventoryCostMap.set(item.inventory_item_id, parseFloat(item.cost) || 0);
      });

      let totalCost = 0;
      let totalRevenue = 0;
      let ordersWithMarginData = 0;

      recentOrders.forEach((order: any) => {
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
      data.marginAnalysis = {
        totalCost,
        totalProfit: totalRevenue - totalCost,
        averageMargin,
        ordersWithMarginData,
        marginDataCoverage: recentOrders.length > 0 ? (ordersWithMarginData / recentOrders.length) * 100 : 0
      };
    }
    
    // Get inventory data - limit to 30 items
    const { data: inventory, error: inventoryError } = await supabase
      .from('shopify_inventory')
      .select('id, product_title, inventory_quantity')
      .eq('connection_id', connection.id)
      .limit(30);
      
    if (!inventoryError) {
      data.inventory = inventory;
    }
    
    // Add store information
    data.storeInfo = {
      name: brand.name,
      shopDomain: connection.shop
    };
    
    // Check if we have enough data to generate recommendations
    const hasData = (
      (data.recentOrders && data.recentOrders.length > 0) ||
      (data.customers && data.customers.length > 0) ||
      (data.inventory && data.inventory.length > 0)
    );
    
    if (!hasData) {
      return NextResponse.json({
        recommendations: [
          {
            title: "Insufficient Data",
            channel: "general",
            targetAudience: "store owner",
            message: "We need more data to generate meaningful recommendations. Please connect your store and ensure you have orders, customers, or inventory data.",
            implementation: ["Connect your store", "Sync your data"],
            expectedOutcome: "Enable AI-powered recommendations"
          }
        ]
      });
    }
    
    // Create a system prompt based on the recommendation area
    let systemPrompt = '';
    
    switch (area) {
      case 'email':
        systemPrompt = `You are an expert email marketing strategist for e-commerce businesses.
        Based on the provided store data, generate 2 specific, actionable email marketing campaign ideas.
        For each campaign idea, include:
        1. A compelling subject line
        2. The target audience segment
        3. The key message and offer
        4. Timing recommendations
        5. Expected outcomes
        
        Format your response as structured JSON with an array of campaign objects.
        Each campaign should have: title, subjectLine, targetAudience, message, timing, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.
        IMPORTANT: Keep your response brief and to the point.`;
        break;
        
      case 'social':
        systemPrompt = `You are an expert social media marketing strategist for e-commerce businesses.
        Based on the provided store data, generate 2 specific, actionable social media campaign ideas.
        For each campaign idea, include:
        1. The campaign concept and theme
        2. The target platforms (Instagram, Facebook, TikTok, etc.)
        3. Content suggestions (post types, hashtags, etc.)
        4. Timing and frequency recommendations
        5. Expected outcomes
        
        Format your response as structured JSON with an array of campaign objects.
        Each campaign should have: title, concept, platforms, contentSuggestions, timing, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.
        IMPORTANT: Keep your response brief and to the point.`;
        break;
        
      case 'product':
        systemPrompt = `You are an expert product marketing strategist for e-commerce businesses.
        Based on the provided store data, generate 2 specific, actionable product marketing recommendations.
        For each recommendation, include:
        1. The specific products to focus on
        2. The marketing approach (bundles, discounts, featured products, etc.)
        3. The target audience
        4. Implementation steps
        5. Expected outcomes
        
        Format your response as structured JSON with an array of recommendation objects.
        Each recommendation should have: title, products, approach, targetAudience, implementation, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.
        IMPORTANT: Keep your response brief and to the point.`;
        break;
        
      case 'pricing':
        systemPrompt = `You are an expert pricing strategist for e-commerce businesses.
        Based on the provided store data, generate 2 specific, actionable pricing optimization recommendations.
        For each recommendation, include:
        1. The specific products or categories to focus on
        2. The recommended pricing strategy (premium pricing, discount strategy, bundle pricing, etc.)
        3. Implementation steps
        4. Expected impact on sales and revenue
        
        Format your response as structured JSON with an array of recommendation objects.
        Each recommendation should have: title, products, strategy, implementation, and expectedImpact properties.
        Make your recommendations specific, data-driven, and immediately actionable.
        IMPORTANT: Keep your response brief and to the point.`;
        break;
        
      default:
        systemPrompt = `You are an expert e-commerce marketing strategist.
        Based on the provided store data, generate 2 specific, actionable marketing recommendations.
        For each recommendation, include:
        1. The marketing channel or approach
        2. The target audience
        3. The key message or offer
        4. Implementation steps
        5. Expected outcomes
        
        Format your response as structured JSON with an array of recommendation objects.
        Each recommendation should have: title, channel, targetAudience, message, implementation, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.
        IMPORTANT: Keep your response brief and to the point.`;
    }
    
    // Generate recommendations using GPT-4
    const responseText = await getGPT4Response(systemPrompt, JSON.stringify(data), 0.7);
    
    // Parse the response as JSON
    let recommendations;
    try {
      recommendations = JSON.parse(responseText);
    } catch (error) {
      console.error('Error parsing GPT-4 response as JSON:', error);
      // Return a fallback response with the raw text
      return NextResponse.json({
        recommendations: [
          {
            title: "AI-Generated Marketing Recommendation",
            channel: area || "marketing",
            targetAudience: "Your customers",
            message: "Our AI system generated recommendations but encountered an issue formatting them.",
            implementation: ["Please try again in a few minutes"],
            expectedOutcome: "Get structured marketing recommendations"
          }
        ]
      });
    }
    
    return NextResponse.json(recommendations);
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    
    // Return a user-friendly error response
    return NextResponse.json({
      recommendations: [
        {
          title: "Service Temporarily Unavailable",
          channel: "general",
          targetAudience: "store owner",
          message: "Our AI recommendation service is currently experiencing high demand. Please try again in a few minutes.",
          implementation: ["Refresh the recommendations tab", "Try a different recommendation category"],
          expectedOutcome: "Get AI-powered marketing recommendations"
        }
      ]
    });
  }
} 
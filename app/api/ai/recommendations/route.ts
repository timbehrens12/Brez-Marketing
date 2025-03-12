import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGPT4Response } from '@/lib/openai';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { brandId, area } = await request.json();
    
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

    // Get connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No Shopify connection found for this brand' }, { status: 404 });
    }

    // Fetch data needed for recommendations
    let data: any = {};
    
    // Get recent orders
    const { data: recentOrders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })
      .limit(100);
      
    if (!ordersError) {
      data.recentOrders = recentOrders;
    }
    
    // Get customer data
    const { data: customers, error: customersError } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('connection_id', connection.id)
      .limit(100);
      
    if (!customersError) {
      data.customers = customers;
    }
    
    // Get inventory data
    const { data: inventory, error: inventoryError } = await supabase
      .from('shopify_inventory')
      .select('*')
      .eq('connection_id', connection.id);
      
    if (!inventoryError) {
      data.inventory = inventory;
    }
    
    // Add store information
    data.storeInfo = {
      name: brand.name,
      shopDomain: connection.shop
    };
    
    // Create a system prompt based on the recommendation area
    let systemPrompt = '';
    
    switch (area) {
      case 'email':
        systemPrompt = `You are an expert email marketing strategist for e-commerce businesses.
        Based on the provided store data, generate 3 specific, actionable email marketing campaign ideas.
        For each campaign idea, include:
        1. A compelling subject line
        2. The target audience segment
        3. The key message and offer
        4. Timing recommendations
        5. Expected outcomes
        
        Format your response as structured JSON with an array of campaign objects.
        Each campaign should have: title, subjectLine, targetAudience, message, timing, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.`;
        break;
        
      case 'social':
        systemPrompt = `You are an expert social media marketing strategist for e-commerce businesses.
        Based on the provided store data, generate 3 specific, actionable social media campaign ideas.
        For each campaign idea, include:
        1. The campaign concept and theme
        2. The target platforms (Instagram, Facebook, TikTok, etc.)
        3. Content suggestions (post types, hashtags, etc.)
        4. Timing and frequency recommendations
        5. Expected outcomes
        
        Format your response as structured JSON with an array of campaign objects.
        Each campaign should have: title, concept, platforms, contentSuggestions, timing, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.`;
        break;
        
      case 'product':
        systemPrompt = `You are an expert product marketing strategist for e-commerce businesses.
        Based on the provided store data, generate 3 specific, actionable product marketing recommendations.
        For each recommendation, include:
        1. The specific products to focus on
        2. The marketing approach (bundles, discounts, featured products, etc.)
        3. The target audience
        4. Implementation steps
        5. Expected outcomes
        
        Format your response as structured JSON with an array of recommendation objects.
        Each recommendation should have: title, products, approach, targetAudience, implementation, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.`;
        break;
        
      case 'pricing':
        systemPrompt = `You are an expert pricing strategist for e-commerce businesses.
        Based on the provided store data, generate 3 specific, actionable pricing optimization recommendations.
        For each recommendation, include:
        1. The specific products or categories to focus on
        2. The recommended pricing strategy (premium pricing, discount strategy, bundle pricing, etc.)
        3. Implementation steps
        4. Expected impact on sales and revenue
        
        Format your response as structured JSON with an array of recommendation objects.
        Each recommendation should have: title, products, strategy, implementation, and expectedImpact properties.
        Make your recommendations specific, data-driven, and immediately actionable.`;
        break;
        
      default:
        systemPrompt = `You are an expert e-commerce marketing strategist.
        Based on the provided store data, generate 3 specific, actionable marketing recommendations.
        For each recommendation, include:
        1. The marketing channel or approach
        2. The target audience
        3. The key message or offer
        4. Implementation steps
        5. Expected outcomes
        
        Format your response as structured JSON with an array of recommendation objects.
        Each recommendation should have: title, channel, targetAudience, message, implementation, and expectedOutcome properties.
        Make your recommendations specific, data-driven, and immediately actionable.`;
    }
    
    // Generate recommendations using GPT-4
    const responseText = await getGPT4Response(systemPrompt, JSON.stringify(data), 0.7);
    
    // Parse the response as JSON
    let recommendations;
    try {
      recommendations = JSON.parse(responseText);
    } catch (error) {
      console.error('Error parsing GPT-4 response as JSON:', error);
      recommendations = { recommendations: responseText };
    }
    
    return NextResponse.json(recommendations);
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
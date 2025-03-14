import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Define the connection type
interface PlatformConnection {
  id: string;
  brand_id: string;
  user_id: string;
  platform_type: string;
  shop?: string;
  access_token?: string;
  status: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const fix = searchParams.get('fix') === 'true';
    
    console.log('Checking Shopify connections for brand:', brandId);
    
    // Get all Shopify connections for the brand
    const { data: connections, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', 'shopify')
      .order('created_at', { ascending: false });
    
    if (connectionError) {
      console.error('Error fetching connections:', connectionError);
      return NextResponse.json({ 
        error: 'Failed to fetch connections', 
        details: connectionError.message 
      }, { status: 500 });
    }
    
    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        message: 'No Shopify connections found',
        connections: []
      });
    }
    
    // Check for issues with each connection
    const connectionIssues = connections.map((connection: PlatformConnection) => {
      const issues = [];
      
      if (!connection.shop) {
        issues.push('Missing shop URL');
      }
      
      if (!connection.access_token) {
        issues.push('Missing access token');
      }
      
      return {
        id: connection.id,
        brand_id: connection.brand_id,
        status: connection.status,
        shop: connection.shop,
        hasAccessToken: !!connection.access_token,
        created_at: connection.created_at,
        issues: issues,
        needsFix: issues.length > 0
      };
    });
    
    // If fix=true and there are issues, attempt to fix them
    if (fix) {
      for (const connection of connectionIssues) {
        if (connection.needsFix) {
          // Only attempt to fix if we have a shop URL from the request
          const shopUrl = searchParams.get('shop');
          if (!shopUrl) {
            return NextResponse.json({ 
              error: 'Shop URL is required to fix connections',
              connections: connectionIssues
            }, { status: 400 });
          }
          
          // Update the connection with the provided shop URL
          const { error: updateError } = await supabase
            .from('platform_connections')
            .update({
              shop: shopUrl,
              status: 'active',
              metadata: {
                shop_url: `https://${shopUrl}`
              }
            })
            .eq('id', connection.id);
          
          if (updateError) {
            console.error('Error updating connection:', updateError);
            return NextResponse.json({ 
              error: 'Failed to update connection', 
              details: updateError.message,
              connections: connectionIssues
            }, { status: 500 });
          }
          
          console.log(`Fixed connection ${connection.id} with shop URL ${shopUrl}`);
        }
      }
      
      // Fetch updated connections
      const { data: updatedConnections } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('platform_type', 'shopify')
        .order('created_at', { ascending: false });
      
      return NextResponse.json({ 
        message: 'Connections fixed successfully',
        connections: updatedConnections
      });
    }
    
    return NextResponse.json({ 
      connections: connectionIssues,
      fixUrl: `${request.url.split('?')[0]}?brandId=${brandId}&fix=true&shop=your-store.myshopify.com`
    });
  } catch (error) {
    console.error('Error checking connections:', error);
    return NextResponse.json({ 
      error: 'Failed to check connections', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
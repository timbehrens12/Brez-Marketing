import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getShopifyApi } from '@/lib/shopify';
import { formatDate, getPeriodDates } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brandId = searchParams.get('brandId');
  const period = searchParams.get('period') || 'monthly';

  if (!brandId) {
    return NextResponse.json(
      { error: 'Brand ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get the connected Shopify account for this brand
    const shopifyConnection = await prisma.shopifyConnection.findFirst({
      where: {
        brandId: brandId,
        active: true,
      },
    });

    if (!shopifyConnection) {
      return NextResponse.json(
        { 
          error: 'No active Shopify connection found',
          products: [] 
        },
        { status: 200 }
      );
    }

    // Get date range based on period
    const { startDate, endDate } = getPeriodDates(period);
    
    // Initialize Shopify API
    const shopify = await getShopifyApi(shopifyConnection);
    
    if (!shopify) {
      return NextResponse.json(
        { 
          error: 'Could not initialize Shopify API',
          products: [] 
        },
        { status: 200 }
      );
    }

    // Fetch best-selling products from Shopify Analytics API
    const response = await shopify.query({
      data: {
        query: `
          query getTopProducts($startDate: String!, $endDate: String!) {
            analytics {
              topProducts(
                startDate: $startDate,
                endDate: $endDate,
                first: 10
              ) {
                edges {
                  node {
                    productId
                    productTitle
                    netQuantity
                    grossSales {
                      amount
                      currencyCode
                    }
                    orderCount
                  }
                }
              }
            }
          }
        `,
        variables: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
        },
      },
    });

    // Format the response
    const products = response?.body?.data?.analytics?.topProducts?.edges?.map(
      (edge: any) => ({
        id: edge.node.productId,
        name: edge.node.productTitle,
        revenue: parseFloat(edge.node.grossSales.amount),
        orders: edge.node.orderCount,
        quantity: edge.node.netQuantity,
      })
    ) || [];

    // Filter out test/demo products
    const filteredProducts = products.filter((product: any) => {
      if (!product || !product.name || typeof product.name !== 'string') return false;
      const name = product.name.toLowerCase();
      return !name.includes('test') && 
            !name.includes('demo') && 
            !name.includes('sample') && 
            !name.includes('unused') &&
            !name.includes('placeholder');
    });

    return NextResponse.json({ products: filteredProducts });
  } catch (error) {
    console.error('Error fetching best-selling products:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch best-selling products',
        message: error instanceof Error ? error.message : 'Unknown error',
        products: [] 
      },
      { status: 200 }
    );
  }
} 
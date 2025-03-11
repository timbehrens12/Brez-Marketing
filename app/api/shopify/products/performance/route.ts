import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ProductMetric {
  id: string
  product_id: string
  product_name?: string
  sku?: string
  views_count?: number
  purchases_count?: number
  view_to_purchase_ratio?: number
  return_rate?: number
  average_rating?: number
  review_count?: number
  inventory_turnover_rate?: number
  revenue_generated?: number
  profit_margin?: number
  connection_id: string
}

interface ProductRelationship {
  id: string
  product_id: string
  related_product_id: string
  relationship_type: string
  strength?: number
  conversion_rate?: number
  connection_id: string
}

interface ProductReview {
  id: string
  product_id: string
  rating: number
  review_title?: string
  review_text?: string
  customer_name?: string
  verified_purchase?: boolean
  helpful_votes?: number
  reviewed_at: string
  connection_id: string
}

interface Connection {
  id: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }
    
    // Get all connections for this brand
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
    
    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }
    
    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        products: [],
        relatedProducts: [],
        reviews: [],
        message: 'No Shopify connections found for this brand'
      })
    }
    
    const connectionIds = connections.map((c: Connection) => c.id)
    
    // Fetch product performance metrics
    const { data: productMetrics, error: metricsError } = await supabase
      .from('product_performance_metrics')
      .select('*')
      .in('connection_id', connectionIds)
    
    if (metricsError) {
      console.error('Error fetching product metrics:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch product metrics' }, { status: 500 })
    }
    
    // Fetch product relationships
    const { data: relationships, error: relationshipsError } = await supabase
      .from('product_relationships')
      .select('*')
      .in('connection_id', connectionIds)
      .order('strength', { ascending: false })
      .limit(10)
    
    if (relationshipsError) {
      console.error('Error fetching product relationships:', relationshipsError)
      return NextResponse.json({ error: 'Failed to fetch product relationships' }, { status: 500 })
    }
    
    // Fetch product reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('product_reviews')
      .select('*')
      .in('connection_id', connectionIds)
      .order('reviewed_at', { ascending: false })
      .limit(20)
    
    if (reviewsError) {
      console.error('Error fetching product reviews:', reviewsError)
      return NextResponse.json({ error: 'Failed to fetch product reviews' }, { status: 500 })
    }
    
    // If we don't have real data yet, return mock data for demonstration
    if (!productMetrics || productMetrics.length === 0) {
      return NextResponse.json({
        products: [
          {
            id: '1',
            name: 'Premium T-Shirt',
            sku: 'TS-001',
            views: 1250,
            purchases: 320,
            viewToPurchaseRatio: 25.6,
            returnRate: 2.8,
            averageRating: 4.7,
            reviewCount: 48,
            inventoryTurnoverRate: 3.2,
            revenue: 12800,
            profitMargin: 42.5
          },
          {
            id: '2',
            name: 'Classic Hoodie',
            sku: 'HD-002',
            views: 980,
            purchases: 210,
            viewToPurchaseRatio: 21.4,
            returnRate: 3.5,
            averageRating: 4.5,
            reviewCount: 32,
            inventoryTurnoverRate: 2.8,
            revenue: 10500,
            profitMargin: 38.2
          },
          {
            id: '3',
            name: 'Slim Fit Jeans',
            sku: 'JN-003',
            views: 1450,
            purchases: 180,
            viewToPurchaseRatio: 12.4,
            returnRate: 8.2,
            averageRating: 4.1,
            reviewCount: 26,
            inventoryTurnoverRate: 2.1,
            revenue: 9000,
            profitMargin: 35.0
          },
          {
            id: '4',
            name: 'Wireless Earbuds',
            sku: 'WE-004',
            views: 2200,
            purchases: 420,
            viewToPurchaseRatio: 19.1,
            returnRate: 5.6,
            averageRating: 4.3,
            reviewCount: 112,
            inventoryTurnoverRate: 4.5,
            revenue: 29400,
            profitMargin: 48.5
          },
          {
            id: '5',
            name: 'Leather Wallet',
            sku: 'LW-005',
            views: 850,
            purchases: 190,
            viewToPurchaseRatio: 22.4,
            returnRate: 1.2,
            averageRating: 4.8,
            reviewCount: 36,
            inventoryTurnoverRate: 2.6,
            revenue: 7600,
            profitMargin: 52.0
          }
        ],
        relatedProducts: [
          { id: '1', name: 'Premium T-Shirt + Classic Hoodie', relationshipType: 'frequently_bought_together', strength: 85, conversionRate: 32.5 },
          { id: '2', name: 'Wireless Earbuds + Phone Case', relationshipType: 'cross-sell', strength: 72, conversionRate: 28.4 },
          { id: '3', name: 'Slim Fit Jeans + Leather Belt', relationshipType: 'frequently_bought_together', strength: 68, conversionRate: 24.2 },
          { id: '4', name: 'Basic T-Shirt → Premium T-Shirt', relationshipType: 'upsell', strength: 62, conversionRate: 18.5 },
          { id: '5', name: 'Leather Wallet + Card Holder', relationshipType: 'cross-sell', strength: 58, conversionRate: 15.8 }
        ],
        reviews: [
          { id: '1', productName: 'Premium T-Shirt', rating: 5, title: 'Great quality!', text: 'The fabric is amazing and it fits perfectly.', customerName: 'John D.', verifiedPurchase: true, helpfulVotes: 12, date: '2023-05-15' },
          { id: '2', productName: 'Wireless Earbuds', rating: 4, title: 'Good sound quality', text: 'Battery life could be better, but sound is excellent.', customerName: 'Sarah M.', verifiedPurchase: true, helpfulVotes: 8, date: '2023-06-02' },
          { id: '3', productName: 'Leather Wallet', rating: 5, title: 'Excellent craftsmanship', text: 'This wallet is beautiful and well-made. Highly recommend!', customerName: 'Michael T.', verifiedPurchase: true, helpfulVotes: 15, date: '2023-05-28' },
          { id: '4', productName: 'Slim Fit Jeans', rating: 3, title: 'Sizing issues', text: 'Quality is good but runs small. Order a size up.', customerName: 'Emily R.', verifiedPurchase: true, helpfulVotes: 20, date: '2023-06-10' },
          { id: '5', productName: 'Classic Hoodie', rating: 5, title: 'So comfortable!', text: 'This is my new favorite hoodie. Super soft and warm.', customerName: 'David K.', verifiedPurchase: true, helpfulVotes: 7, date: '2023-06-05' }
        ],
        isMockData: true
      })
    }
    
    // Format the real data to match the expected structure
    const formattedProducts = productMetrics.map((metric: ProductMetric) => ({
      id: metric.id,
      name: metric.product_name || `Product ${metric.product_id.substring(0, 8)}`,
      sku: metric.sku || 'N/A',
      views: metric.views_count || 0,
      purchases: metric.purchases_count || 0,
      viewToPurchaseRatio: metric.view_to_purchase_ratio || 0,
      returnRate: metric.return_rate || 0,
      averageRating: metric.average_rating || 0,
      reviewCount: metric.review_count || 0,
      inventoryTurnoverRate: metric.inventory_turnover_rate || 0,
      revenue: metric.revenue_generated || 0,
      profitMargin: metric.profit_margin || 0
    }))
    
    const formattedRelationships = relationships.map((rel: ProductRelationship) => {
      // Get product names from the metrics data
      const sourceProduct = productMetrics.find((p: ProductMetric) => p.product_id === rel.product_id)
      const relatedProduct = productMetrics.find((p: ProductMetric) => p.product_id === rel.related_product_id)
      
      let relationshipName = ''
      if (sourceProduct && relatedProduct) {
        if (rel.relationship_type === 'upsell') {
          relationshipName = `${sourceProduct.product_name || 'Product'} → ${relatedProduct.product_name || 'Product'}`
        } else {
          relationshipName = `${sourceProduct.product_name || 'Product'} + ${relatedProduct.product_name || 'Product'}`
        }
      } else {
        relationshipName = `Product ${rel.product_id.substring(0, 8)} + Product ${rel.related_product_id.substring(0, 8)}`
      }
      
      return {
        id: rel.id,
        name: relationshipName,
        relationshipType: rel.relationship_type,
        strength: rel.strength || 0,
        conversionRate: rel.conversion_rate || 0
      }
    })
    
    const formattedReviews = reviews.map((review: ProductReview) => {
      // Get product name from the metrics data
      const product = productMetrics.find((p: ProductMetric) => p.product_id === review.product_id)
      
      return {
        id: review.id,
        productName: product?.product_name || `Product ${review.product_id.substring(0, 8)}`,
        rating: review.rating,
        title: review.review_title || 'Review',
        text: review.review_text || '',
        customerName: review.customer_name || 'Anonymous',
        verifiedPurchase: review.verified_purchase || false,
        helpfulVotes: review.helpful_votes || 0,
        date: review.reviewed_at
      }
    })
    
    return NextResponse.json({
      products: formattedProducts,
      relatedProducts: formattedRelationships,
      reviews: formattedReviews,
      isMockData: false
    })
    
  } catch (error) {
    console.error('Error in product performance endpoint:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch product performance data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 
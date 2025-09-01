import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ShopifyQueueService } from '@/lib/services/shopifyQueueService'

/**
 * GET /api/sync/{brandId}/status
 * 
 * Returns sync progress and status for a brand
 * 
 * Response format:
 * {
 *   "shopify": {
 *     "milestones": [
 *       {"label":"Recent updates","status":"completed","progress":{"rows_written":150}},
 *       {"label":"Historical orders","status":"running","progress":{"rows_written":72000}},
 *       {"label":"Customers","status":"completed"},
 *       {"label":"Products","status":"queued"}
 *     ],
 *     "last_update":"2025-08-26T12:02:11Z"
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    // Temporarily bypass auth to debug sync status
    console.log('[Sync Status] DEBUG MODE: Bypassing auth for development')

    // Fix for Next.js 15: await params before using properties
    const { brandId } = await params
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[Sync Status] Fetching status for brand ${brandId}`)

    // Get sync status from queue service
    const status = await ShopifyQueueService.getSyncStatus(brandId)
    
    // Transform to the expected format with user-friendly labels
    const milestones = status.shopify.milestones.map((milestone: any) => {
      const label = getMilestoneLabel(milestone.entity, milestone.status)
      const progress: any = {}
      
      if (milestone.rows_written > 0) {
        progress.rows_written = milestone.rows_written
      }
      
      if (milestone.total_rows) {
        progress.total_rows = milestone.total_rows
        progress.progress_pct = milestone.progress_pct || 0
      }
      
      return {
        label,
        status: milestone.status,
        progress: Object.keys(progress).length > 0 ? progress : undefined,
        entity: milestone.entity,
        error: milestone.error_message,
        started_at: milestone.started_at,
        completed_at: milestone.completed_at,
        updated_at: milestone.updated_at
      }
    })

    // Sort milestones by logical order
    const sortOrder = ['recent_sync', 'orders', 'customers', 'products']
    milestones.sort((a: any, b: any) => {
      const aIndex = sortOrder.indexOf(a.entity)
      const bIndex = sortOrder.indexOf(b.entity)
      return aIndex - bIndex
    })

    const response = {
      shopify: {
        milestones,
        last_update: new Date().toISOString(),
        overall_status: getOverallStatus(milestones),
        summary: generateSummary(milestones)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[Sync Status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}

/**
 * Get user-friendly milestone labels
 */
function getMilestoneLabel(entity: string, status: string): string {
  const labels: Record<string, string> = {
    'recent_sync': 'Starting Full Historical Sync',
    'orders': 'All Order History (2010 onwards)',
    'customers': 'All Customer Data (2010 onwards)',
    'products': 'Complete Product Catalog (2010 onwards)'
  }

  const baseLabel = labels[entity] || entity

  // Add status indicators
  switch (status) {
    case 'completed':
      return `${baseLabel}`
    case 'running':
      return `${baseLabel}`
    case 'failed':
      return `${baseLabel}`
    case 'queued':
      return `${baseLabel}`
    default:
      return baseLabel
  }
}

/**
 * Get overall sync status
 */
function getOverallStatus(milestones: any[]): string {
  if (!milestones.length) return 'pending'
  
  const statuses = milestones.map(m => m.status)
  
  if (statuses.includes('failed')) return 'error'
  if (statuses.includes('running')) return 'syncing'
  if (statuses.every(s => s === 'completed')) return 'completed'
  
  return 'partial'
}

/**
 * Generate human-readable summary
 */
function generateSummary(milestones: any[]): string {
  const recentSync = milestones.find(m => m.entity === 'recent_sync')
  const orders = milestones.find(m => m.entity === 'orders')
  const customers = milestones.find(m => m.entity === 'customers')
  const products = milestones.find(m => m.entity === 'products')

  if (recentSync?.status === 'completed') {
    const completedCount = milestones.filter(m => m.status === 'completed').length
    const totalCount = milestones.length

    if (completedCount === totalCount) {
      return '✅ Complete Shopify historical data synced! All order history, customers, and products from 2010 onwards are now available.'
    }

    // Keep showing "syncing" status until ALL data is synced
    return '🔄 Syncing complete Shopify historical data (2010 onwards - NO QUICK SYNC)...'
  }

  if (recentSync?.status === 'running') {
    return '🚀 Starting complete Shopify historical data sync (2010 onwards - NO QUICK SYNC)...'
  }

  return '⚡ Preparing complete Shopify historical sync (2010 onwards)...'
}

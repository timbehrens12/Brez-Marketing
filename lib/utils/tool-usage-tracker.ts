/**
 * Tool Usage Tracker
 * 
 * Utility functions to track tool usage across the application
 * and update availability status in the action center.
 */

// Define tool types for type safety
export type ToolId = 
  | 'campaign-optimizer'
  | 'lead-generator' 
  | 'outreach-tool'
  | 'marketing-assistant'
  | 'brand-reports'
  | 'ad-creative-studio'
  | 'weekly-creative-batch'

// Tool usage tracking function
export function trackToolUsage(toolId: ToolId, context?: any) {
  console.log(`[Tool Tracker] 📊 Tool used: ${toolId}`, context)
  
  try {
    // Dispatch custom event to notify action center components
    window.dispatchEvent(new CustomEvent('toolUsed', { 
      detail: { 
        toolId,
        timestamp: new Date().getTime(),
        context
      }
    }))
    
    console.log(`[Tool Tracker] ✅ Tool usage event dispatched for ${toolId}`)
  } catch (error) {
    console.error(`[Tool Tracker] ❌ Error tracking tool usage:`, error)
  }
}

// AI usage tracking for brand-dependent tools
export async function trackAIToolUsage(
  toolId: 'campaign-optimizer' | 'marketing-assistant' | 'brand-reports',
  brandId: string,
  userId: string
) {
  const featureTypeMap: { [key: string]: string } = {
    'campaign-optimizer': 'campaign_recommendations',
    'marketing-assistant': 'marketing_analysis', 
    'brand-reports': 'health_report'
  }
  
  const featureType = featureTypeMap[toolId]
  if (!featureType) {
    console.warn(`[Tool Tracker] Unknown AI tool: ${toolId}`)
    return
  }
  
  try {
    const response = await fetch('/api/ai/usage-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId,
        userId,
        featureType,
        action: 'record_usage'
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`[Tool Tracker] ✅ AI usage recorded for ${featureType}:`, data)
      
      // Also track general tool usage
      trackToolUsage(toolId, { brandId, featureType })
      
      return data
    } else {
      console.error(`[Tool Tracker] ❌ Failed to record AI usage: ${response.status}`)
    }
  } catch (error) {
    console.error(`[Tool Tracker] ❌ Error recording AI usage:`, error)
  }
}

// Lead generator usage tracking  
export async function trackLeadGeneratorUsage(userId: string) {
  try {
    // Update local usage data (this would typically sync with backend)
    const response = await fetch('/api/leads/usage-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'record_generation'
      })
    })
    
    if (response.ok) {
      console.log(`[Tool Tracker] ✅ Lead generator usage recorded`)
      trackToolUsage('lead-generator', { userId })
    }
  } catch (error) {
    console.error(`[Tool Tracker] ❌ Error recording lead generator usage:`, error)
  }
}

// Creative studio usage tracking
export function trackCreativeStudioUsage(userId: string, brandId?: string, creativeCount: number = 1) {
  console.log(`[Tool Tracker] 🎨 Creative studio used: ${creativeCount} creatives generated`)
  
  trackToolUsage('ad-creative-studio', { 
    userId, 
    brandId, 
    creativeCount,
    type: 'single_creative'
  })
}

// Weekly creative batch usage tracking
export function trackWeeklyCreativeUsage(userId: string, brandId?: string, creativeCount: number = 10) {
  console.log(`[Tool Tracker] 📅 Weekly creative batch used: ${creativeCount} creatives generated`)
  
  trackToolUsage('weekly-creative-batch', {
    userId,
    brandId, 
    creativeCount,
    type: 'weekly_batch'
  })
}

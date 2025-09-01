import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

// Lead scoring calculation (matches the frontend)
const calculateLeadScore = (lead: any): { total: number, breakdown: any } => {
  if (!lead) return { total: 0, breakdown: {} }
  
  const scores = {
    contactInfo: 0,
    socialPresence: 0,
    businessInfo: 0,
    geographic: 0
  }
  
  // Contact Information (45 points max)
  if (lead.email) scores.contactInfo += 18
  if (lead.phone) scores.contactInfo += 17
  if (lead.website) scores.contactInfo += 10
  
  // Social Media Presence (30 points max)
  if (lead.instagram_handle) scores.socialPresence += 10
  if (lead.facebook_page) scores.socialPresence += 8
  if (lead.linkedin_profile) scores.socialPresence += 9
  if (lead.twitter_handle) scores.socialPresence += 3
  
  // Business Information (15 points max)
  if (lead.business_name) scores.businessInfo += 5
  if (lead.owner_name) scores.businessInfo += 10
  
  // Geographic (10 points max)
  if (lead.city) scores.geographic += 3
  if (lead.state_province) scores.geographic += 4
  if (lead.city && lead.state_province) scores.geographic += 3 // Bonus for complete location
  
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0)
  
  return { total, breakdown: scores }
}

export async function POST() {
  try {
    console.log('Starting lead score recalculation...')
    
    const supabase = getSupabaseServiceClient()
    
    // Get all leads
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
    
    if (fetchError) {
      console.error('Error fetching leads:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }
    
    if (!leads || leads.length === 0) {
      return NextResponse.json({ message: 'No leads found to update' })
    }
    
    console.log(`Found ${leads.length} leads to update`)
    
    // Calculate new scores and prepare updates
    const updates = leads.map(lead => {
      const scoreData = calculateLeadScore(lead)
      return {
        id: lead.id,
        lead_score: scoreData.total
      }
    })
    
    // Update scores in batches of 100
    let updated = 0
    const batchSize = 100
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      for (const update of batch) {
        const { error } = await supabase
          .from('leads')
          .update({ lead_score: update.lead_score })
          .eq('id', update.id)
        
        if (error) {
          console.error(`Error updating lead ${update.id}:`, error)
        } else {
          updated++
        }
      }
      
      console.log(`Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`)
    }
    
    console.log(`Successfully updated ${updated}/${leads.length} lead scores`)
    
    return NextResponse.json({ 
      message: `Successfully updated ${updated} lead scores`,
      total: leads.length,
      updated
    })
    
  } catch (error) {
    console.error('Error in recalculate-scores:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
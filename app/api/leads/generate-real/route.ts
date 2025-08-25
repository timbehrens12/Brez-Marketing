import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'
import OpenAI from 'openai'
import { validateRequest, leadGenerationRequestSchema, checkRateLimit, addSecurityHeaders, sanitizeString, sanitizeAIInput } from '@/lib/utils/validation'

const supabase = getSupabaseServiceClient()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Usage limits for weekly system
const WEEKLY_GENERATION_LIMIT = 1 // 1 generation per week for cost control
const TOTAL_LEADS_PER_GENERATION = 25 // 25 leads per generation 
const MIN_NICHES_PER_SEARCH = 1 // Minimum 1 niche per search
const MAX_NICHES_PER_SEARCH = 5 // Maximum 5 niches per search
const NICHE_COOLDOWN_HOURS = 72 // 72 hours (3 days) cooldown per niche



// Set maximum duration for this API route (90 seconds)
export const maxDuration = 90

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    
    // Validate request input
    const validatedData = validateRequest(leadGenerationRequestSchema, requestData)
    if (validatedData instanceof NextResponse) {
      return addSecurityHeaders(validatedData)
    }
    
    const { businessType, niches, location, brandId, userId, localDate, localStartOfDayUTC } = validatedData

    // Rate limiting - 2 requests per hour for lead generation
    const rateLimitResponse = await checkRateLimit(userId, 'lead-generation', 2, 3600)
    if (rateLimitResponse) return rateLimitResponse

    // Sanitize inputs
    const sanitizedBusinessType = sanitizeString(businessType, 100)
    const sanitizedNiches = niches.map(niche => sanitizeString(niche, 100))
    const sanitizedLocation = sanitizeString(location, 200)

    // Check niche limit (already validated by schema, but double-check)
    if (sanitizedNiches.length < MIN_NICHES_PER_SEARCH || sanitizedNiches.length > MAX_NICHES_PER_SEARCH) {
      return addSecurityHeaders(NextResponse.json({ 
        error: `Invalid niche selection. Minimum ${MIN_NICHES_PER_SEARCH} and maximum ${MAX_NICHES_PER_SEARCH} niches allowed.` 
      }, { status: 400 }))
    }

    // Get current date for weekly-based resets - use client's local date
    const now = new Date()
    
    // Calculate start of current week (Monday at 12:00 AM) using user's local timezone
    const currentDate = new Date(localStartOfDayUTC)
    const dayOfWeek = currentDate.getDay()
    const startOfWeek = new Date(currentDate)
    
    // Calculate days to subtract to get to Monday
    // Sunday = 0, Monday = 1, Tuesday = 2, etc.
    // If Sunday (0), subtract 6 days to get to previous Monday
    // If Monday (1), subtract 0 days (already Monday)
    // If Tuesday (2), subtract 1 day to get to Monday, etc.
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(currentDate.getDate() - daysToSubtract)
    startOfWeek.setHours(0, 0, 0, 0) // Set to midnight
    
    // Next reset is next Monday at 12:00 AM (Sunday night at midnight)
    const startOfNextWeek = new Date(startOfWeek)
    startOfNextWeek.setDate(startOfWeek.getDate() + 7)
    startOfNextWeek.setHours(0, 0, 0, 0) // Ensure it's exactly midnight

    // Check user's weekly usage using client's timezone
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startOfWeek.toISOString().split('T')[0]) // Start of week
      .lt('date', startOfNextWeek.toISOString().split('T')[0]) // End of week

    if (usageError) {
      console.error('Error checking usage:', usageError)
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 })
    }

    // Sum up generation count for the week
    const currentWeeklyUsage = usageData?.reduce((sum, record) => sum + (record.generation_count || 0), 0) || 0
    const leadsGeneratedThisWeek = usageData?.reduce((sum, record) => sum + (record.leads_generated || 0), 0) || 0
    
    // Check if user has exceeded weekly limit
    if (currentWeeklyUsage >= WEEKLY_GENERATION_LIMIT) {
      return NextResponse.json({ 
        error: `Weekly limit reached. You've used ${currentWeeklyUsage} of ${WEEKLY_GENERATION_LIMIT} generations this week. Resets Sunday night at midnight (Monday 12:00 AM).`,
        usage: {
          used: currentWeeklyUsage,
          limit: WEEKLY_GENERATION_LIMIT,
          resetsAt: startOfNextWeek.toISOString(),
          resetsIn: startOfNextWeek.getTime() - now.getTime()
        }
      }, { status: 429 })
    }

    // Check niche-specific cooldowns (7-day cooldown) using client's timezone
    const { data: nicheUsageData, error: nicheUsageError } = await supabase
      .from('user_niche_usage')
      .select('*')
      .eq('user_id', userId)
      .in('niche_id', niches)
      .gte('last_used_at', new Date(now.getTime() - (NICHE_COOLDOWN_HOURS * 60 * 60 * 1000)).toISOString())

    if (nicheUsageError) {
      console.error('Error checking niche usage:', nicheUsageError)
      return NextResponse.json({ error: 'Failed to check niche cooldowns' }, { status: 500 })
    }

    // Check if any selected niches are on cooldown
    const cooldownNiches = nicheUsageData || []
    if (cooldownNiches.length > 0) {
      // Get niche names for better error message
      const { data: nicheNames } = await supabase
        .from('lead_niches')
        .select('id, name')
        .in('id', cooldownNiches.map(n => n.niche_id))

      const nicheNameMap = Object.fromEntries(nicheNames?.map(n => [n.id, n.name]) || [])
      const cooldownNicheNames = cooldownNiches.map(n => nicheNameMap[n.niche_id] || 'Unknown')

      return NextResponse.json({ 
        error: `These niches are on cooldown: ${cooldownNicheNames.join(', ')}. Try again in 7 days or select different niches.`,
        cooldownNiches: cooldownNiches.map(n => ({
          niche_id: n.niche_id,
          niche_name: nicheNameMap[n.niche_id],
          cooldownUntil: new Date(new Date(n.last_used_at).getTime() + (NICHE_COOLDOWN_HOURS * 60 * 60 * 1000)).toISOString()
        }))
      }, { status: 429 })
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key missing')
      return NextResponse.json({ 
        error: 'Google Places API not configured. Please contact the developer for assistance with API setup.' 
      }, { status: 500 })
    }

    // Get niche details from database
    // console.log('Fetching niches for:', niches)
    const { data: nicheData, error: nicheError } = await supabase
      .from('lead_niches')
      .select('*')
      .in('id', niches)
    
    if (nicheError) {
      console.error('Error fetching niches:', nicheError)
      return NextResponse.json({ error: 'Invalid niche selection' }, { status: 400 })
    }

    // console.log('Found niches:', nicheData?.length || 0)

    // Calculate total leads that will be generated (25 per generation)
    const totalLeadsToGenerate = TOTAL_LEADS_PER_GENERATION
    
    // console.log(`Starting lead generation for ${niches.length} niches × ${TOTAL_LEADS_PER_GENERATION} leads`)

    // Find real businesses using Google Places API with comprehensive error handling
    let realLeads: any[] = []
    
    try {
      // Add timeout wrapper for the entire lead generation process (75 seconds)
      const result = await Promise.race([
        findRealBusinesses(nicheData, location, totalLeadsToGenerate, niches.length),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Lead generation timeout - process took too long')), 75000)
        )
      ]) as any
      
      // If no leads were found, provide helpful error message
      if (!result || !result.leads || result.leads.length === 0) {
        return NextResponse.json({ 
          error: 'Google Places API could not find businesses matching your criteria. This may be due to API rate limits, service issues, or no businesses in the specified location. Please try again later or contact the developer for assistance.',
          foundCount: 0 
        }, { status: 503 })
      }
      
      realLeads = result.leads
      // console.log(`Found ${realLeads.length} business leads`)
    
    // console.log(`Lead generation completed: found ${realLeads.length} valid businesses out of ${totalLeadsToGenerate} attempted`)
    } catch (error: any) {
      console.error('Error in findRealBusinesses:', error)
      
      // If the entire search fails, still return a helpful response instead of crashing
      if (error.message?.includes('Lead generation timeout')) {
        return NextResponse.json({ 
          error: 'Lead generation is taking longer than expected. This can happen with 5 niches. Please try again or reduce the number of niches.' 
        }, { status: 504 })
      } else if (error.message?.includes('504')) {
        return NextResponse.json({ 
          error: 'Server timeout occurred during lead generation. Some external services may be temporarily unavailable. Please try again in a few minutes.' 
        }, { status: 503 })
      } else if (error.message?.includes('fetch failed') || error.code === 'ENOTFOUND') {
        return NextResponse.json({ 
          error: 'Network connectivity issues occurred during lead generation. Please check your internet connection and try again.' 
        }, { status: 503 })
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        return NextResponse.json({ 
          error: 'API rate limits reached. Please try again in a few minutes.' 
        }, { status: 429 })
      } else {
        // For any other unexpected error, still try to provide a helpful response
        console.error('Unexpected error during lead generation:', error)
        return NextResponse.json({ 
          error: 'An unexpected error occurred during lead generation. Please try again with different criteria or contact support if the issue persists.' 
        }, { status: 500 })
      }
    }
    
    if (realLeads.length === 0) {
      return NextResponse.json({ 
        error: 'No real businesses found matching your criteria. This could be due to:\n• Limited businesses in the selected area\n• Network timeouts or server errors\n• Restrictive search criteria\n\nTry expanding your search area, selecting different niches, or trying again later.' 
      }, { status: 404 })
    }

    // Store leads in database - only the ones that were successfully found
    const leadsToInsert = realLeads.map((lead: any) => {
      const baseData = {
        business_name: lead.business_name,
        owner_name: lead.owner_name,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        city: lead.city,
        state_province: lead.state_province,
        niche_name: lead.niche_name,
        instagram_handle: lead.instagram_handle,
        facebook_page: lead.facebook_page,
        linkedin_profile: lead.linkedin_profile,
        twitter_handle: lead.twitter_handle,
        user_id: userId,
        business_type: businessType,
        status: 'new',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Only include brand_id if it's provided
      if (brandId) {
        return { ...baseData, brand_id: brandId }
      }
      
      return baseData
    })

    // Remove duplicates within the batch to prevent ON CONFLICT errors
    const uniqueLeadsToInsert = leadsToInsert.filter((lead, index, self) => {
      const duplicateIndex = self.findIndex(l => 
        l.user_id === lead.user_id && 
        l.business_name === lead.business_name && 
        l.email === lead.email
      )
      return duplicateIndex === index
    })

    // Use upsert to handle potential duplicates with database
    let insertedLeads: any[] = []
    let savedCount = 0
    
    try {
      const { data, error: insertError } = await supabase
      .from('leads')
      .upsert(uniqueLeadsToInsert, { 
        onConflict: 'user_id,business_name,email',
        ignoreDuplicates: true 
      })
      .select()

    if (insertError) {
        console.error('Error inserting leads batch:', insertError)
        
        // If batch insert fails, try inserting leads one by one to save what we can
        // console.log('Attempting to save leads individually...')
        for (const lead of uniqueLeadsToInsert) {
          try {
            const { data: singleLead, error: singleError } = await supabase
              .from('leads')
              .upsert([lead], { 
                onConflict: 'user_id,business_name,email',
                ignoreDuplicates: true 
              })
              .select()
            
            if (!singleError && singleLead && singleLead.length > 0) {
              insertedLeads.push(singleLead[0])
              savedCount++
              // console.log(`Successfully saved: ${lead.business_name}`)
            } else {
              // console.log(`Failed to save ${lead.business_name}: ${singleError?.message || 'Unknown error'}`)
            }
          } catch (singleLeadError: any) {
            // console.log(`Error saving individual lead ${lead.business_name}: ${singleLeadError.message || 'Unknown error'}`)
            continue
          }
        }
        
        if (savedCount === 0) {
          return NextResponse.json({ 
            error: 'Failed to save any discovered leads to database. Please try again or contact support if the issue persists.',
            foundCount: realLeads.length 
          }, { status: 500 })
        }
        
        // console.log(`Saved ${savedCount} out of ${uniqueLeadsToInsert.length} leads individually`)
      } else {
        insertedLeads = data || []
        savedCount = insertedLeads.length
        // console.log(`Successfully saved ${savedCount} leads in batch`)
      }
    } catch (dbError: any) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({ 
        error: 'Database connection issues occurred. Please try again in a few moments.',
        foundCount: realLeads.length 
      }, { status: 503 })
    }

    // TRACK LEAD DISTRIBUTION for diversification system
    if (insertedLeads && insertedLeads.length > 0) {
      // console.log(`🔄 DIVERSIFICATION: Tracking ${insertedLeads.length} distributed leads for future diversification`)
      
      const distributionEntries = insertedLeads.map((lead: any) => ({
        business_name: lead.business_name,
        business_address: lead.city && lead.state_province ? `${lead.city}, ${lead.state_province}` : null,
        city: lead.city,
        state_province: lead.state_province,
        niche_name: lead.niche_name,
        place_id: null, // We'll enhance this later if we store place_id in leads
        search_query: `${lead.niche_name} in ${location.city}, ${location.state}`,
        distribution_count: 1,
        last_distributed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      
      // Track each business distribution individually
      for (const entry of distributionEntries) {
        try {
          // Check if this business already exists in tracking
          const { data: existingEntry } = await supabase
            .from('lead_distribution_tracking')
            .select('id, distribution_count')
            .eq('business_name', entry.business_name)
            .eq('city', entry.city)
            .eq('niche_name', entry.niche_name)
            .single()
          
          if (existingEntry) {
            // Update existing entry with incremented count
            await supabase
              .from('lead_distribution_tracking')
              .update({
                distribution_count: existingEntry.distribution_count + 1,
                last_distributed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', existingEntry.id)
          } else {
            // Insert new entry
            await supabase
              .from('lead_distribution_tracking')
              .insert([entry])
          }
                 } catch (trackingError) {
           console.error(`Error tracking individual lead ${entry.business_name}:`, trackingError)
           // Continue with other entries
         }
       }
       
       // console.log(`🔄 DIVERSIFICATION: Successfully tracked ${distributionEntries.length} lead distributions`)
    }

    // Update usage tracking
    const newGenerationCount = currentWeeklyUsage + 1
    const newLeadsGenerated = leadsGeneratedThisWeek + savedCount

    const todaysUsage = usageData?.find(record => record.date === localDate)
    
    if (todaysUsage) {
      // Update existing record for today
      const { error: updateError } = await supabase
        .from('user_usage')
        .update({
          generation_count: (todaysUsage.generation_count || 0) + 1,
          leads_generated: (todaysUsage.leads_generated || 0) + savedCount,
          last_generation_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', localDate)

      if (updateError) {
        console.error('Error updating usage:', updateError)
      }
    } else {
      // Create new record for today
      const { error: insertUsageError } = await supabase
        .from('user_usage')
        .insert({
          user_id: userId,
          date: localDate,
          generation_count: 1,
          leads_generated: savedCount,
          last_generation_at: new Date().toISOString()
        })

      if (insertUsageError) {
        console.error('Error inserting usage:', insertUsageError)
      }
    }

    // Update niche-specific usage tracking
    const nicheUsageUpdates = niches.map((nicheId: string) => ({
      user_id: userId,
      niche_id: nicheId,
      last_used_at: new Date().toISOString(),
      leads_generated: TOTAL_LEADS_PER_GENERATION
    }))

    const { error: nicheUsageUpdateError } = await supabase
      .from('user_niche_usage')
      .upsert(nicheUsageUpdates, {
        onConflict: 'user_id,niche_id'
      })

    if (nicheUsageUpdateError) {
      console.error('Error updating niche usage:', nicheUsageUpdateError)
    }

    // console.log(`Lead generation complete. Returning ${savedCount} leads to frontend.`)

    return NextResponse.json({
      success: true,
      leads: insertedLeads,
      message: realLeads.length === totalLeadsToGenerate 
        ? `Found ${savedCount} real businesses (${TOTAL_LEADS_PER_GENERATION} per generation) with AI-enriched contact data`
        : `Found ${savedCount} real businesses out of ${totalLeadsToGenerate} attempted. Some businesses may have been skipped due to timeouts, server errors, or data quality issues.`,
      generatedBy: 'Google Places API + ChatGPT Website Enrichment',
      leadsPerGeneration: TOTAL_LEADS_PER_GENERATION,
      attempted: totalLeadsToGenerate,
      successful: realLeads.length,
      saved: savedCount,

      usage: {
        used: newGenerationCount,
        limit: WEEKLY_GENERATION_LIMIT,
        leadsGenerated: savedCount,
        totalLeadsThisWeek: newLeadsGenerated
      }
    })

  } catch (error) {
    console.error('Real lead generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error during real lead discovery' },
      { status: 500 }
    )
  }
}

async function findRealBusinesses(niches: any[], location: any, maxResults: number, nicheCount: number) {
  const foundBusinesses: any[] = []
  
  // Calculate leads per niche - distribute 25 leads across all niches
  const baseLeadsPerNiche = Math.floor(maxResults / nicheCount)
  const extraLeads = maxResults % nicheCount
  
  // LEAD DIVERSIFICATION SYSTEM
  // Get recently distributed leads to avoid duplicates across users
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  
  // Check both the leads table and the distribution tracking table
  const [recentLeadsResult, distributionTrackingResult] = await Promise.all([
    supabase
      .from('leads')
      .select('business_name, city, state_province, niche_name')
      .gte('created_at', recentCutoff.toISOString()),
    supabase
      .from('lead_distribution_tracking')
      .select('business_name, city, state_province, niche_name, distribution_count, place_id, last_distributed_at')
      .gte('last_distributed_at', recentCutoff.toISOString())
  ])
  
  const recentLeads = recentLeadsResult.data || []
  const distributionData = distributionTrackingResult.data || []
  
  // Create sets for efficient lookups
  const recentBusinessNames = new Set(
    recentLeads.map(lead => 
      `${lead.business_name.toLowerCase()}_${lead.city?.toLowerCase()}_${lead.niche_name?.toLowerCase()}`
    )
  )
  
  // Track heavily distributed businesses (distributed 3+ times in last week)
  const overDistributedBusinesses = new Set(
    distributionData
      .filter(item => item.distribution_count >= 3)
      .map(item => 
        `${item.business_name.toLowerCase()}_${item.city?.toLowerCase()}_${item.niche_name?.toLowerCase()}`
      )
  )
  
  // Track place IDs to avoid exact duplicates
  const distributedPlaceIds = new Set(
    distributionData
      .filter(item => item.place_id)
      .map(item => item.place_id)
  )
  
  // console.log(`🔄 DIVERSIFICATION: Found ${recentBusinessNames.size} recently distributed leads, ${overDistributedBusinesses.size} over-distributed businesses, ${distributedPlaceIds.size} tracked place IDs to avoid`)
  
  // Process niches in parallel for faster execution
  const nichePromises = niches.map(async (niche, nicheIndex) => {
    // This niche gets extra leads if it's one of the first few
    const resultsPerNiche = baseLeadsPerNiche + (nicheIndex < extraLeads ? 1 : 0)
    try {
      // console.log(`Searching for ${niche.name} businesses in ${location.city}, ${location.state}`)
      
      // SMART SEARCH VARIATION - Add randomization to prevent identical results
      const searchVariations = [
        `${niche.name} in ${location.city}, ${location.state}`,
        `${niche.name} near ${location.city}, ${location.state}`,
        `${niche.name} ${location.city} ${location.state}`,
        `best ${niche.name} ${location.city}`,
        `top ${niche.name} in ${location.city}`
      ]
      
      // Randomly select search variation for diversity
      const searchQuery = searchVariations[Math.floor(Math.random() * searchVariations.length)]
      
      // GEOGRAPHIC VARIATION - Slightly vary search radius and location for diversity
      const baseRadius = parseInt(location.radius) || 5
      const radiusVariation = Math.floor(Math.random() * 3) - 1 // -1, 0, or +1 miles
      const searchRadius = Math.max(1, baseRadius + radiusVariation)
      
      const locationBias = location.city ? `${location.city}, ${location.state || ''}` : ''
      
      // Google Places Text Search API with timeout
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${locationBias}&radius=${searchRadius * 1609}&key=${process.env.GOOGLE_PLACES_API_KEY}`
      
      // console.log(`Google Places search: ${searchQuery} (radius: ${searchRadius}mi)`)
      
      // Add timeout for the search request
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), 8000) // 8 second timeout for search
      
      const placesResponse = await fetch(placesUrl, {
        signal: abortController.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!placesResponse.ok) {
        // console.log(`Google Places search failed for ${niche.name}: ${placesResponse.status}`)
        return []
      }
      
      const placesData = await placesResponse.json()
      
      if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', placesData.status, placesData.error_message)
        return []
      }
      
      // console.log(`Found ${placesData.results?.length || 0} places for ${niche.name}`)
      
             // LEAD FILTERING & RANDOMIZATION
       const allPlaces = placesData.results || []
       
       // Advanced filtering for maximum diversification
       const availablePlaces = allPlaces.filter((place: any) => {
         const businessKey = `${place.name?.toLowerCase()}_${location.city?.toLowerCase()}_${niche.name?.toLowerCase()}`
         
         // Filter out recently distributed businesses
         if (recentBusinessNames.has(businessKey)) {
           return false
         }
         
         // Filter out over-distributed businesses
         if (overDistributedBusinesses.has(businessKey)) {
           return false
         }
         
         // Filter out exact place ID matches
         if (place.place_id && distributedPlaceIds.has(place.place_id)) {
           return false
         }
         
         return true
       })
       
               // console.log(`🔄 DIVERSIFICATION: ${allPlaces.length} total places, ${availablePlaces.length} available (${allPlaces.length - availablePlaces.length} filtered out for diversification)`)
        
        // INTELLIGENT FALLBACK - If too many businesses filtered out, use relaxed filtering
        let placesToProcess = []
        
        if (availablePlaces.length >= resultsPerNiche) {
          // Enough diverse businesses available - use strict filtering
          const shuffledPlaces = [...availablePlaces]
          
          // Fisher-Yates shuffle for true randomization
          for (let i = shuffledPlaces.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPlaces[i], shuffledPlaces[j]] = [shuffledPlaces[j], shuffledPlaces[i]]
          }
          
          placesToProcess = shuffledPlaces.slice(0, resultsPerNiche)
          // console.log(`🔄 DIVERSIFICATION: Using ${placesToProcess.length} strictly filtered businesses`)
          
        } else if (availablePlaces.length > 0) {
          // Some businesses available but not enough - use what we have
          placesToProcess = [...availablePlaces]
          // console.log(`🔄 DIVERSIFICATION: Using ${placesToProcess.length} available businesses (less than requested ${resultsPerNiche})`)
          
        } else {
          // No businesses available with strict filtering - use relaxed filtering
          // console.log(`🔄 DIVERSIFICATION: No businesses available with strict filtering, using relaxed filtering`)
          
          const relaxedPlaces = allPlaces.filter((place: any) => {
            // Only filter out businesses distributed very recently (24 hours)
            const businessKey = `${place.name?.toLowerCase()}_${location.city?.toLowerCase()}_${niche.name?.toLowerCase()}`
            const veryRecentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
            
            // Check if this business was distributed in the last 24 hours
            const wasDistributedRecently = distributionData.some(item => {
              const itemKey = `${item.business_name.toLowerCase()}_${item.city?.toLowerCase()}_${item.niche_name?.toLowerCase()}`
              return itemKey === businessKey && new Date(item.last_distributed_at) > veryRecentCutoff
            })
            
            return !wasDistributedRecently
          })
          
          if (relaxedPlaces.length > 0) {
            // Shuffle and take from relaxed results
            const shuffledRelaxed = [...relaxedPlaces]
            for (let i = shuffledRelaxed.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledRelaxed[i], shuffledRelaxed[j]] = [shuffledRelaxed[j], shuffledRelaxed[i]]
            }
            placesToProcess = shuffledRelaxed.slice(0, resultsPerNiche)
            // console.log(`🔄 DIVERSIFICATION: Using ${placesToProcess.length} businesses with relaxed 24-hour filtering`)
          } else {
            // Last resort - use all available businesses but shuffle them
            const shuffledAll = [...allPlaces]
            for (let i = shuffledAll.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffledAll[i], shuffledAll[j]] = [shuffledAll[j], shuffledAll[i]]
            }
            placesToProcess = shuffledAll.slice(0, resultsPerNiche)
            // console.log(`🔄 DIVERSIFICATION: Last resort - using ${placesToProcess.length} randomly shuffled businesses`)
          }
        }
      
      // Process businesses in parallel for faster processing
      const businessPromises = placesToProcess.map(async (place: any) => {
        try {
          // Get detailed place information with timeout
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,business_status,rating,user_ratings_total,opening_hours,geometry&key=${process.env.GOOGLE_PLACES_API_KEY}`
          
          // console.log(`Getting place details: ${place.name || 'unknown business'}`)
          
          // Add timeout for Google Places API call (increased to 8 seconds)
          const abortController = new AbortController()
          const timeoutId = setTimeout(() => abortController.abort(), 8000) // 8 second timeout
          
          const detailsResponse = await fetch(detailsUrl, {
            signal: abortController.signal
          })
          
          clearTimeout(timeoutId)
          
          if (!detailsResponse.ok) {
            // console.log(`Google Places API error for ${place.name || 'unknown business'}: ${detailsResponse.status} ${detailsResponse.statusText}`)
            return null
          }
          
          const detailsData = await detailsResponse.json()
          
          if (detailsData.status === 'OK' && detailsData.result) {
            const business = detailsData.result
            
            // Only include businesses that are currently operational
            if (business.business_status === 'OPERATIONAL') {
              const lead = await enrichBusinessData(business, niche, location)
                          if (lead) {
              // console.log(`Added real business: ${business.name}`)
              return lead
            }
            }
          } else {
            // console.log(`Google Places API returned status ${detailsData.status} for ${place.name || 'unknown business'}`)
          }
        } catch (detailError: any) {
          // Handle specific error types
          if (detailError.name === 'AbortError') {
            // console.log(`Timeout getting place details for ${place.name || 'unknown business'}`)
          } else if (detailError.message?.includes('504')) {
            // console.log(`Server timeout (504) for ${place.name || 'unknown business'} - skipping`)
          } else if (detailError.message?.includes('fetch failed')) {
            // console.log(`Network error for ${place.name || 'unknown business'}: ${detailError.message}`)
          } else {
          // console.log(`Error getting place details for ${place.name || 'unknown business'}: ${detailError.message || 'Unknown error'}`)
          }
          return null
        }
        
        return null
      })

      // Wait for all businesses to be processed in parallel - use allSettled to continue even if some fail
      const processedBusinessResults = await Promise.allSettled(businessPromises)
      const processedBusinesses = processedBusinessResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<any>).value)
      
      // console.log(`Successfully processed ${processedBusinesses.length} businesses for ${niche.name}`)
      return processedBusinesses
      
    } catch (error: any) {
      // Handle niche-level errors gracefully
      if (error.message?.includes('504')) {
        // console.log(`Server timeout (504) searching for ${niche.name} - skipping this niche`)
      } else if (error.name === 'AbortError') {
        // console.log(`Timeout searching for ${niche.name} - skipping this niche`)
      } else {
        // console.log(`Error searching for ${niche.name}: ${error.message || 'Unknown error'} - skipping this niche`)
      }
      return []
    }
  })

  // Wait for all niches to be processed in parallel
  const nicheResults = await Promise.allSettled(nichePromises)
  
  // Collect all successful results
  for (const result of nicheResults) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      for (const business of result.value) {
        if (business && foundBusinesses.length < maxResults) {
          foundBusinesses.push(business)
        }
      }
    }
  }
  
  // FINAL DIVERSIFICATION - Shuffle final results to prevent patterns
  for (let i = foundBusinesses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [foundBusinesses[i], foundBusinesses[j]] = [foundBusinesses[j], foundBusinesses[i]]
  }
  
  // console.log(`Final results - ${foundBusinesses.length} unique businesses across all niches`)
  
  return {
    leads: foundBusinesses
  }
}

async function enrichBusinessData(business: any, niche: any, location: any) {
  try {
    // Extract real data from Google Places
    const name = business.name || 'N/A'
    const phone = business.formatted_phone_number || null
    const website = business.website || null
    
    // Parse address for city/state
    const address = business.formatted_address || ''
    const addressParts = address.split(', ')
    const city = location.city || (addressParts.length > 1 ? addressParts[addressParts.length - 3] : null)
    const state = location.state || (addressParts.length > 1 ? addressParts[addressParts.length - 2]?.split(' ')[0] : null)
    
    // AI-powered website enrichment with timeout and better error handling
    let enrichedData = {
      owner_name: null,
      email: null,
      instagram_handle: null,
      facebook_page: null,
      linkedin_profile: null,
      twitter_handle: null
    }
    
    if (website && process.env.OPENAI_API_KEY) {
      // console.log(`Enriching data for ${name} using website: ${website}`)
      try {
        // Add timeout wrapper for AI enrichment (8 seconds max for better results)
        enrichedData = await Promise.race([
          enrichWithAI(name, website, location.city, location.state),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI enrichment timeout')), 8000)
          )
        ]) as any
        
        // Validate enriched data
        if (!enrichedData || typeof enrichedData !== 'object') {
          // console.log(`Invalid enriched data for ${name}, using defaults`)
          enrichedData = {
            owner_name: null,
            email: null,
            instagram_handle: null,
            facebook_page: null,
            linkedin_profile: null,
            twitter_handle: null
          }
        }
      } catch (enrichmentError: any) {
        // Handle specific enrichment errors
        if (enrichmentError.message?.includes('504')) {
          // console.log(`Server timeout (504) during enrichment for ${name}, using basic data`)
        } else if (enrichmentError.message?.includes('timeout')) {
          // console.log(`AI enrichment timeout for ${name}, using basic data`)
        } else if (enrichmentError.message?.includes('fetch failed')) {
          // console.log(`Network error during enrichment for ${name}, using basic data`)
        } else {
          // console.log(`AI enrichment failed for ${name}: ${enrichmentError.message || 'Unknown error'}, using basic data`)
      }
        
        // Reset to default values on any error
        enrichedData = {
          owner_name: null,
          email: null,
          instagram_handle: null,
          facebook_page: null,
          linkedin_profile: null,
          twitter_handle: null
        }
      }
    }
    
    // Always return a valid lead object, even if enrichment fails
    const lead = {
      business_name: name,
      owner_name: enrichedData.owner_name,
      email: enrichedData.email,
      phone,
      website,
      city,
      state_province: state,
      niche_name: niche.name,
      instagram_handle: enrichedData.instagram_handle,
      facebook_page: enrichedData.facebook_page,
      linkedin_profile: enrichedData.linkedin_profile,
      twitter_handle: enrichedData.twitter_handle
    }
    
    // console.log(`Successfully created lead for ${name}`)
    return lead
    
  } catch (error: any) {
    // Handle any unexpected errors in business data enrichment
    if (error.message?.includes('504')) {
      // console.log(`Server timeout (504) processing business data for ${business.name || 'unknown business'}, skipping`)
    } else {
      // console.log(`Error enriching business data for ${business.name || 'unknown business'}: ${error.message || 'Unknown error'}, skipping`)
    }
    return null
  }
}

async function enrichWithAI(businessName: string, websiteUrl: string, city: string, state: string) {
  try {
    // First, try to fetch the website content with additional error handling
    const websiteContent = await scrapeWebsite(websiteUrl)
    
    if (!websiteContent) {
      // console.log(`Could not scrape content from ${websiteUrl}, using basic business data`)
      return {
        owner_name: null,
        email: null,
        instagram_handle: null,
        facebook_page: null,
        linkedin_profile: null,
        twitter_handle: null
      }
    }

    // Use ChatGPT to extract contact information
    const prompt = `
You are a professional data extraction specialist. I need you to thoroughly analyze the following website content for a business and extract ALL available contact information and social media profiles.

Business: ${businessName}
Location: ${city}, ${state}
Website URL: ${websiteUrl}

Website Content:
${websiteContent.substring(0, 4000)} // Limit content to avoid token limits

CRITICAL INSTRUCTIONS:
1. Look for ALL social media platforms mentioned or linked on the website
2. Extract actual URLs, usernames, handles, and page names
3. Check footer links, header menus, contact pages, and social media sections
4. Look for social media icons, "Follow us" sections, and embedded social feeds
5. Extract the exact URLs or handles as they appear on the website

Please extract the following information and return it as a valid JSON object only:
{
  "owner_name": "Owner or contact person name (if found)",
  "email": "Primary business email address (if found)",
  "instagram_handle": "Instagram username or full URL (if found)",
  "facebook_page": "Facebook page name or full URL (if found)",
  "linkedin_profile": "LinkedIn company page URL or company name (if found)",
  "twitter_handle": "Twitter/X username or full URL (if found)"
}

SOCIAL MEDIA EXTRACTION GUIDELINES:
- Instagram: Look for @username, instagram.com/username, or Instagram links
- Facebook: Look for facebook.com/pagename, Facebook links, or page names
- LinkedIn: Look for linkedin.com/company/name, LinkedIn company pages, or business profiles
- Twitter/X: Look for @username, twitter.com/username, x.com/username, or Twitter links

IMPORTANT: 
- Return ONLY the JSON object, no markdown formatting, no backticks, no additional text
- Extract information exactly as it appears on the website
- For social media, include the full URL if available, otherwise just the username/handle
- For LinkedIn, make sure to extract the company page URL, not personal profiles
- If not found, return null for that field
- Be thorough - check all sections of the website content for social media mentions
- Look for variations like "Follow us on", "Connect with us", social media icons, etc.
`

    // console.log(`OpenAI API call: Analyzing website content for ${businessName}`)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: 500
    })

    const result = response.choices[0]?.message?.content?.trim()
    
    if (result) {
      try {
        // Clean the response by removing markdown code blocks if present
        let cleanedResult = result
        if (result.includes('```json')) {
          cleanedResult = result.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
        } else if (result.includes('```')) {
          cleanedResult = result.replace(/```\s*/g, '').trim()
        }
        
        const extractedData = JSON.parse(cleanedResult)
        // console.log(`AI extracted data for ${businessName}:`, extractedData)
        
        // Process and validate social media URLs
        const processedData = {
          owner_name: extractedData.owner_name,
          email: extractedData.email,
          instagram_handle: processSocialMediaUrl('instagram', extractedData.instagram_handle, businessName),
          facebook_page: processSocialMediaUrl('facebook', extractedData.facebook_page, businessName),
          linkedin_profile: processSocialMediaUrl('linkedin', extractedData.linkedin_profile, businessName),
          twitter_handle: processSocialMediaUrl('twitter', extractedData.twitter_handle, businessName)
        }
        
        // console.log(`Processed social media data for ${businessName}:`, processedData)
        return processedData
      } catch (parseError) {
        // console.log(`Error parsing AI response for ${businessName}, using basic data`)
      }
    }

  } catch (error: any) {
    if (error.code === 'insufficient_quota') {
      // console.log(`OpenAI quota exceeded, using basic data for ${businessName}`)
    } else if (error.code === 'rate_limit_exceeded') {
      // console.log(`OpenAI rate limit exceeded, using basic data for ${businessName}`)
    } else if (error.message?.includes('504')) {
      // console.log(`Server timeout (504) during AI enrichment for ${businessName}, using basic data`)
    } else {
      // console.log(`Error in AI enrichment for ${businessName}: ${error.message || 'Unknown error'}`)
    }
  }

  // Return null values if AI extraction fails
  return {
    owner_name: null,
    email: null,
    instagram_handle: null,
    facebook_page: null,
    linkedin_profile: null,
    twitter_handle: null
  }
}

async function scrapeWebsite(url: string): Promise<string | null> {
  try {
    // Clean up the URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Create abort controller for timeout - increased to 8 seconds for better scraping
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 8000) // 8 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      signal: abortController.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 403) {
        // console.log(`Access forbidden for ${url} (403) - site may block crawlers`)
      } else if (response.status === 404) {
        // console.log(`Page not found for ${url} (404)`)
      } else if (response.status === 504) {
        // console.log(`Gateway timeout for ${url} (504) - server temporarily unavailable`)
      } else if (response.status >= 500) {
        // console.log(`Server error for ${url} (${response.status}) - ${response.statusText}`)
      } else {
        // console.log(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }
      return null
    }

    const html = await response.text()
    
    // Enhanced HTML parsing to preserve social media links and structure
    let cleanHtml = html
      // Remove script and style tags but preserve their content structure
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    
    // Extract and preserve social media links before removing HTML tags
    const socialMediaLinks: string[] = []
    const socialMediaPatterns = [
      /href=["']([^"']*(?:instagram|facebook|linkedin|twitter|x)\.com[^"']*)/gi,
      /(?:instagram|facebook|linkedin|twitter|x)\.com\/[\w\-\.]+/gi,
      /@[\w\-\.]+/g // Handles like @username
    ]
    
    socialMediaPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(html)) !== null) {
        socialMediaLinks.push(match[1] || match[0])
      }
    })
    
    // Remove HTML tags but preserve text content and structure
    cleanHtml = cleanHtml
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    // Append extracted social media links to the content for AI processing
    if (socialMediaLinks.length > 0) {
      cleanHtml += '\n\nSocial Media Links Found: ' + socialMediaLinks.join(', ')
    }

    return cleanHtml

  } catch (error: any) {
    if (error.name === 'AbortError') {
      // console.log(`Request timeout for ${url}`)
    } else if (error.code === 'ENOTFOUND') {
      // console.log(`Domain not found for ${url}`)
    } else if (error.code === 'ECONNREFUSED') {
      // console.log(`Connection refused for ${url}`)
    } else if (error.code === 'ECONNRESET') {
      // console.log(`Connection reset for ${url}`)
    } else if (error.message?.includes('504')) {
      // console.log(`Gateway timeout (504) for ${url}`)
    } else if (error.message?.includes('fetch failed')) {
      // console.log(`Fetch failed for ${url}: ${error.message}`)
    } else {
      // console.log(`Error scraping ${url}: ${error.message || 'Unknown error'}`)
    }
    return null
  }
}

function processSocialMediaUrl(platform: string, rawUrl: string | null, businessName: string): string | null {
  if (!rawUrl || rawUrl === 'null' || rawUrl.toLowerCase() === 'n/a') return null
  
  // Clean up the URL
  let url = rawUrl.trim()
  
  // Remove quotes and extra characters
  url = url.replace(/['"]/g, '')
  
  switch (platform) {
    case 'instagram':
      // Handle Instagram URLs and usernames
      if (url.includes('instagram.com/')) {
        // Extract username from full URL
        const match = url.match(/instagram\.com\/([^\/\?\s]+)/)
        if (match && match[1] && match[1] !== 'p' && match[1] !== 'reel' && match[1] !== 'stories') {
          return `https://instagram.com/${match[1]}`
        }
      } else if (url.startsWith('@')) {
        // Handle @username format
        const username = url.substring(1)
        return `https://instagram.com/${username}`
      } else if (!url.includes('/') && url.length > 0) {
        // Handle plain username
        return `https://instagram.com/${url}`
      }
      break
      
    case 'facebook':
      // Handle Facebook URLs and page names
      if (url.includes('facebook.com/')) {
        // Extract page name from full URL
        const match = url.match(/facebook\.com\/([^\/\?\s]+)/)
        if (match && match[1]) {
          const pageName = match[1]
          // Filter out invalid Facebook handles
          const invalidHandles = ['pages', 'profile.php', 'groups', 'home', 'login', 'sharer', 'dialog', 'tr', 'plugins', 'help', 'facebook-f']
          if (!invalidHandles.includes(pageName.toLowerCase()) && pageName.length >= 3) {
            return `https://facebook.com/${pageName}`
          }
        }
      } else if (!url.includes('/') && url.length >= 3) {
        // Handle plain page name
        const invalidHandles = ['facebook-f', 'facebook', 'pages']
        if (!invalidHandles.includes(url.toLowerCase())) {
          return `https://facebook.com/${url}`
        }
      }
      break
      
    case 'linkedin':
      // Handle LinkedIn URLs and company names
      if (url.includes('linkedin.com/')) {
        // Make sure it's a company page, not a personal profile
        if (url.includes('/company/')) {
          return url.startsWith('http') ? url : `https://${url}`
        } else if (url.includes('/in/')) {
          // Convert personal profile to company search - this is a fallback
          // console.log(`Found personal LinkedIn profile for ${businessName}, skipping: ${url}`)
          return null
        }
      } else if (url.includes('company/')) {
        // Handle company/name format
        return `https://linkedin.com/${url}`
      } else if (!url.includes('/') && url.length > 0) {
        // Handle plain company name
        return `https://linkedin.com/company/${url}`
      }
      break
      
    case 'twitter':
      // Handle Twitter/X URLs and usernames
      if (url.includes('twitter.com/') || url.includes('x.com/')) {
        // Extract username from full URL
        const match = url.match(/(?:twitter|x)\.com\/([^\/\?\s]+)/)
        if (match && match[1] && match[1] !== 'intent' && match[1] !== 'home' && !match[1].includes('status')) {
          return `https://x.com/${match[1]}`
        }
      } else if (url.startsWith('@')) {
        // Handle @username format
        const username = url.substring(1)
        return `https://x.com/${username}`
      } else if (!url.includes('/') && url.length > 0) {
        // Handle plain username
        return `https://x.com/${url}`
      }
      break
  }
  
  // console.log(`Could not process ${platform} URL for ${businessName}: ${rawUrl}`)
  return null
}
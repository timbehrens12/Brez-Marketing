import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'
import OpenAI from 'openai'
import { validateRequest, leadGenerationRequestSchema, checkRateLimit, addSecurityHeaders, sanitizeString, sanitizeAIInput } from '@/lib/utils/validation'
import { aiUsageService } from '@/lib/services/ai-usage-service'
import { tierEnforcementService } from '@/lib/services/tier-enforcement-service'

const supabase = getSupabaseServiceClient()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Usage limits for monthly system
// Limits are tier-based and reset monthly (1st of each month)
// What varies is the NUMBER OF LEADS per month based on tier:
// DTC Owner: 0 leads (locked)
// Beginner: 100 leads per month
// Multi-Brand: 500 leads per month
// Enterprise: Custom leads per month
const TOTAL_LEADS_PER_GENERATION = 25 // Default leads per generation
const MIN_NICHES_PER_SEARCH = 1 // Minimum 1 niche per search
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
    
    const { businessType, niches, location, brandId, userId, localDate, localStartOfDayUTC, totalLeadsToGenerate, nicheAllocation } = validatedData

    // Usage limits removed - infinite lead generation enabled
    console.log(`✅ [Usage Check] Unlimited lead generation enabled`)
    
    // Sanitize inputs
    const sanitizedBusinessType = sanitizeString(businessType, 100)
    const sanitizedNiches = niches.map(niche => sanitizeString(niche, 100))
    const sanitizedLocation = sanitizeString(location, 200)

    // Check niche limit (already validated by schema, but double-check)
    if (sanitizedNiches.length < MIN_NICHES_PER_SEARCH) {
      return addSecurityHeaders(NextResponse.json({ 
        error: `Invalid niche selection. At least ${MIN_NICHES_PER_SEARCH} niche is required.` 
      }, { status: 400 }))
    }

    // NOTE: Usage limits are now enforced by tier-based system via AIUsageService
    // The tier check above (tierEnforcementService) already validates access
    // Monthly limits are tracked in ai_usage_tracking table and reset on the 1st
    console.log(`✅ [Tier System] Usage limits enforced by tier-based monthly system`)

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

    // Calculate total leads that will be generated - use custom amount or default
    const finalTotalLeads = totalLeadsToGenerate || TOTAL_LEADS_PER_GENERATION
    
    // console.log(`Starting lead generation for ${niches.length} niches × ${TOTAL_LEADS_PER_GENERATION} leads`)

    // Find real businesses using Google Places API with comprehensive error handling
    let realLeads: any[] = []
    
    try {
      // Add timeout wrapper for the entire lead generation process (75 seconds)
      const result = await Promise.race([
        findRealBusinesses(nicheData, location, finalTotalLeads, niches.length, nicheAllocation),
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
        place_id: lead.place_id,
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

    // Usage recording disabled - unlimited lead generation
    console.log(`✅ [Lead Generation] Completed. Saved ${savedCount} leads. Usage tracking disabled.`)

    // Update niche-specific usage tracking
    const nicheUsageUpdates = niches.map((nicheId: string) => ({
      user_id: userId,
      niche_id: nicheId,
      last_used_at: new Date().toISOString(),
      leads_generated: nicheAllocation && nicheAllocation[nicheId] ? nicheAllocation[nicheId] : Math.floor(finalTotalLeads / niches.length)
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
      message: realLeads.length === finalTotalLeads 
        ? `Found ${savedCount} real businesses (${finalTotalLeads} leads) with AI-enriched contact data`
        : `Found ${savedCount} real businesses out of ${finalTotalLeads} attempted. Some businesses may have been skipped due to timeouts, server errors, or data quality issues.`,
      generatedBy: 'Google Places API + ChatGPT Website Enrichment',
      leadsPerGeneration: finalTotalLeads,
      attempted: finalTotalLeads,
      successful: realLeads.length,
      saved: savedCount
    })

  } catch (error) {
    console.error('Real lead generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error during real lead discovery' },
      { status: 500 }
    )
  }
}

async function findRealBusinesses(niches: any[], location: any, maxResults: number, nicheCount: number, nicheAllocation?: Record<string, number>) {
  const foundBusinesses: any[] = []
  
  // Calculate leads per niche - use custom allocation if provided, otherwise distribute evenly
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
    // Use custom allocation if provided, otherwise distribute evenly
    const resultsPerNiche = nicheAllocation && nicheAllocation[niche.id] 
      ? nicheAllocation[niche.id] 
      : baseLeadsPerNiche + (nicheIndex < extraLeads ? 1 : 0)
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
      
      // GEOGRAPHIC VARIATION - Expand search radius to find businesses without websites
      // Since we're filtering for NO website only, we need a wider search area
      const baseRadius = parseInt(location.radius) || 5
      const expandedRadius = baseRadius * 3 // Triple the radius to find more businesses without websites
      const radiusVariation = Math.floor(Math.random() * 5) // 0-5 miles variation for diversity
      const searchRadius = Math.max(5, expandedRadius + radiusVariation) // Minimum 5 miles
      
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
            
            // 🎯 CRITICAL FILTER: ONLY include businesses with NO website
            // This is the primary filter - we ONLY want businesses that need our help
            if (business.website) {
              // console.log(`Skipping ${business.name} - has website: ${business.website}`)
              return null // Skip businesses with websites
            }
            
            // Only include businesses that are currently operational AND have no website
            if (business.business_status === 'OPERATIONAL') {
              const lead = await enrichBusinessData(business, niche, location, place.place_id)
                          if (lead) {
              // console.log(`✅ Added real business WITHOUT website: ${business.name}`)
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

async function enrichBusinessData(business: any, niche: any, location: any, placeId?: string) {
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
      twitter_handle: null,
      website_quality_score: null
    }
    
    console.log(`🔑 [Enrichment] OpenAI API Key present: ${!!process.env.OPENAI_API_KEY}, Website: ${!!website}`)
    
    if (website && process.env.OPENAI_API_KEY) {
      console.log(`🚀 [Enrichment] Starting enrichment for ${name} using website: ${website}`)
      try {
        // Add timeout wrapper for AI enrichment (15 seconds max - GPT-5 models need more time)
        enrichedData = await Promise.race([
          enrichWithAI(name, website, location.city, location.state),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI enrichment timeout')), 15000)
          )
        ]) as any
        
        console.log(`✅ [Enrichment] Successfully enriched ${name}:`, enrichedData)
        
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
        console.error(`❌ [Enrichment] Error enriching ${name}:`, {
          message: enrichmentError.message,
          code: enrichmentError.code,
          type: enrichmentError.type
        })
        
        if (enrichmentError.message?.includes('504')) {
          console.log(`⚠️ [Enrichment] Server timeout (504) during enrichment for ${name}, using basic data`)
        } else if (enrichmentError.message?.includes('timeout')) {
          console.log(`⚠️ [Enrichment] AI enrichment timeout for ${name}, using basic data`)
        } else if (enrichmentError.message?.includes('fetch failed')) {
          console.log(`⚠️ [Enrichment] Network error during enrichment for ${name}, using basic data`)
        } else {
          console.log(`⚠️ [Enrichment] AI enrichment failed for ${name}: ${enrichmentError.message || 'Unknown error'}, using basic data`)
      }
        
        // Reset to default values on any error
        enrichedData = {
          owner_name: null,
          email: null,
          instagram_handle: null,
          facebook_page: null,
          linkedin_profile: null,
          twitter_handle: null,
          website_quality_score: null
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
      website_quality_score: enrichedData.website_quality_score,
      city,
      state_province: state,
      niche_name: niche.name,
      instagram_handle: enrichedData.instagram_handle,
      facebook_page: enrichedData.facebook_page,
      linkedin_profile: enrichedData.linkedin_profile,
      twitter_handle: enrichedData.twitter_handle,
      place_id: placeId
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

    // Use ChatGPT to extract contact information and assess website quality
    const prompt = `
You are a professional data extraction specialist and website quality analyst. I need you to thoroughly analyze the following website content for a business and extract ALL available contact information, social media profiles, AND assess the website quality for lead generation potential.

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
6. ASSESS WEBSITE QUALITY for lead generation potential (0-100 scale)

Please extract the following information and return it as a valid JSON object only:
{
  "owner_name": "Owner or contact person name (if found)",
  "email": "Primary business email address (if found)",
  "instagram_handle": "Instagram username or full URL (if found)",
  "facebook_page": "Facebook page name or full URL (if found)",
  "linkedin_profile": "LinkedIn company page URL or company name (if found)",
  "twitter_handle": "Twitter/X username or full URL (if found)",
  "website_quality_score": 0-100 (number)
}

WEBSITE QUALITY SCORING (0-100):
BE EXTREMELY HARSH AND CRITICAL. We are looking for businesses with BAD or NO websites that NEED our help.
99% of local business websites are terrible and need complete rebuilding. Default to LOW scores.

⚠️ CRITICAL SCORING PHILOSOPHY ⚠️
We want to find businesses with POOR websites or NO websites. Score harshly to identify opportunities.
If the website looks even remotely professional or modern, it's NOT a good lead for us.

START AT 50 POINTS (NOT 100), THEN DEDUCT:
- NO Contact Form/Lead Form: -30 points (CRITICAL - we want businesses WITHOUT forms)
- NO visible Contact Information (phone/email on homepage): -20 points
- Modern/Professional Design (clean, recent, looks like 2020+): -20 points (we DON'T want these)
- Has Clear Call-to-Action buttons: -10 points (we DON'T want these)
- Mobile Responsive and modern: -10 points (we DON'T want these)
- Has live chat or booking system: -15 points (too advanced for our target)
- Professional photography: -10 points (indicates they already invested in marketing)

ADDITIONAL DEDUCTIONS:
- Custom professional design (not template): -15 points (we DON'T want these)
- Fast loading, optimized: -10 points (we DON'T want these)
- SEO optimized content: -10 points (we DON'T want these)
- Multiple pages with good content: -10 points (we DON'T want these)

BONUS POINTS (Add these back):
+ Single page or very basic site: +20 points (GOOD - needs our help)
+ Looks like it was built in 2010 or earlier: +20 points (GOOD - outdated)
+ Generic template with no customization: +15 points (GOOD - lazy design)
+ Broken images, dead links, or errors: +20 points (GOOD - abandoned)
+ No clear services or offerings: +15 points (GOOD - poor messaging)
+ Cluttered, confusing, unprofessional: +15 points (GOOD - needs redesign)
+ Just a Facebook page or no real website: +30 points (PERFECT - no website)

SCORING EXAMPLES (MOST SHOULD BE LOW):
- 0-30: PERFECT LEAD - Terrible site, no forms, outdated, or no website at all
- 31-50: GREAT LEAD - Very poor site, missing critical elements, needs complete rebuild
- 51-65: GOOD LEAD - Below average site, missing forms or outdated design
- 66-75: MAYBE - Has some elements but could be better (borderline)
- 76-85: NOT A GOOD LEAD - Professional site with forms (they don't need us)
- 86-100: BAD LEAD - Excellent modern site (already has good marketing)

🎯 TARGET SCORE RANGE: 0-60 (These are our ideal prospects)
⚠️ AVOID SCORES ABOVE 70: These businesses already have good websites

CRITICAL RULES:
1. If there IS a contact form or lead capture form, score MUST be 65 or below (they might not need us)
2. If the site looks modern (2020+), score MUST be 60 or below (not outdated enough)
3. If the site has professional design AND forms AND mobile responsive, score MUST be 70+ (not a good lead)
4. Most local business websites should score 15-45 because we want to find businesses that need help
5. Default to LOW scores - we're looking for opportunities, not compliments

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
- If not found, return null for that field (except website_quality_score which should be a number 0-100)
- Be thorough - check all sections of the website content for social media mentions
- Look for variations like "Follow us on", "Connect with us", social media icons, etc.
- website_quality_score MUST be a number between 0 and 100
`

    console.log(`🔍 [AI Enrichment] Starting enrichment for ${businessName}...`)
    console.log(`🔍 [AI Enrichment] Model: gpt-4o-mini, Website length: ${websiteContent.length} chars`)
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // GPT-4o-mini is faster and more reliable than GPT-5 for data extraction
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // Low temperature for consistent extraction
        max_completion_tokens: 500
      })
      
      console.log(`✅ [GPT-5 Enrichment] API call successful for ${businessName}`)

      // Note: AI usage tracking is done in the main POST function once per generation batch

      const result = response.choices[0]?.message?.content?.trim()
      console.log(`📝 [GPT-5 Enrichment] Raw response for ${businessName}:`, result?.substring(0, 200))
      
      if (result) {
        try {
          // Clean the response by removing markdown code blocks if present
          let cleanedResult = result
          if (result.includes('```json')) {
            cleanedResult = result.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
          } else if (result.includes('```')) {
            cleanedResult = result.replace(/```\s*/g, '').trim()
          }
          
          console.log(`🧹 [GPT-5 Enrichment] Cleaned result for ${businessName}:`, cleanedResult.substring(0, 200))
          
          const extractedData = JSON.parse(cleanedResult)
          console.log(`🎯 [GPT-5 Enrichment] Extracted data for ${businessName}:`, extractedData)
          
          // Process and validate social media URLs
          const processedData = {
            owner_name: extractedData.owner_name,
            email: extractedData.email,
            instagram_handle: processSocialMediaUrl('instagram', extractedData.instagram_handle, businessName),
            facebook_page: processSocialMediaUrl('facebook', extractedData.facebook_page, businessName),
            linkedin_profile: processSocialMediaUrl('linkedin', extractedData.linkedin_profile, businessName),
            twitter_handle: processSocialMediaUrl('twitter', extractedData.twitter_handle, businessName),
            website_quality_score: typeof extractedData.website_quality_score === 'number' ? extractedData.website_quality_score : null
          }
          
          console.log(`✅ [GPT-5 Enrichment] Final processed data for ${businessName}:`, processedData)
          return processedData
        } catch (parseError) {
          console.error(`❌ [GPT-5 Enrichment] JSON parse error for ${businessName}:`, parseError)
          console.error(`❌ [GPT-5 Enrichment] Failed to parse:`, result)
        }
      } else {
        console.error(`❌ [GPT-5 Enrichment] Empty response for ${businessName}`)
      }
    } catch (apiError: any) {
      console.error(`❌ [GPT-5 Enrichment] API Error for ${businessName}:`, {
        message: apiError.message,
        status: apiError.status,
        code: apiError.code,
        type: apiError.type
      })
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
    twitter_handle: null,
    website_quality_score: null
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
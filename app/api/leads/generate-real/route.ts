import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'
import OpenAI from 'openai'

const supabase = getSupabaseServiceClient()

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Updated usage limits
const DAILY_GENERATION_LIMIT = 5 // 5 generations per day
const LEADS_PER_NICHE = 15 // Reduced from 25 to 15 for faster processing
const MAX_NICHES_PER_SEARCH = 3 // Reduced from 5 to 3 for faster processing
const NICHE_COOLDOWN_HOURS = 24 // 24 hour cooldown per niche

export async function POST(request: NextRequest) {
  try {
    const { businessType, niches, location, brandId, userId, localDate, localStartOfDayUTC } = await request.json()

    console.log('Real lead generation request:', { businessType, niches: niches?.length, location, brandId, userId })

    if (!userId) {
      console.error('Authentication failed:', { userId: !!userId, brandId: !!brandId })
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }

    if (!localDate || !localStartOfDayUTC) {
      return NextResponse.json({ error: 'Client date information required' }, { status: 400 })
    }

    // Check niche limit
    if (niches.length > MAX_NICHES_PER_SEARCH) {
      return NextResponse.json({ 
        error: `Too many niches selected. Maximum ${MAX_NICHES_PER_SEARCH} niches allowed per search (${LEADS_PER_NICHE} leads each).` 
      }, { status: 400 })
    }

    // Get current date for midnight-based resets - use client's local date
    const now = new Date()

    // Check user's daily usage using client's local date
    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', localDate) // Use client's local date
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking usage:', usageError)
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 })
    }

    // Check if user has exceeded daily limit
    const currentUsage = usageData?.generation_count || 0
    if (currentUsage >= DAILY_GENERATION_LIMIT) {
      // Calculate next midnight reset using client's timezone
      const startOfUserDay = new Date(localStartOfDayUTC);
      const tomorrow = new Date(startOfUserDay);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return NextResponse.json({ 
        error: `Daily limit reached. You've used ${currentUsage} of ${DAILY_GENERATION_LIMIT} generations today. Resets at midnight.`,
        usage: {
          used: currentUsage,
          limit: DAILY_GENERATION_LIMIT,
          resetsAt: tomorrow.toISOString(),
          resetsIn: tomorrow.getTime() - now.getTime()
        }
      }, { status: 429 })
    }

    // Check niche-specific cooldowns (cooldown until midnight) using client's timezone
    const startOfToday = new Date(localStartOfDayUTC);
    
    const startOfUserDay = new Date(localStartOfDayUTC);
    const tomorrow = new Date(startOfUserDay);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: nicheUsageData, error: nicheUsageError } = await supabase
      .from('user_niche_usage')
      .select('*')
      .eq('user_id', userId)
      .in('niche_id', niches)
      .gte('last_used_at', startOfToday.toISOString())

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
        error: `These niches are on cooldown: ${cooldownNicheNames.join(', ')}. Try again after midnight or select different niches.`,
        cooldownNiches: cooldownNiches.map(n => ({
          niche_id: n.niche_id,
          niche_name: nicheNameMap[n.niche_id],
          cooldownUntil: tomorrow.toISOString()
        }))
      }, { status: 429 })
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key missing')
      return NextResponse.json({ error: 'Google Places API not configured' }, { status: 500 })
    }

    // Get niche details from database
    console.log('Fetching niches for:', niches)
    const { data: nicheData, error: nicheError } = await supabase
      .from('lead_niches')
      .select('*')
      .in('id', niches)
    
    if (nicheError) {
      console.error('Error fetching niches:', nicheError)
      return NextResponse.json({ error: 'Invalid niche selection' }, { status: 400 })
    }

    console.log('Found niches:', nicheData?.length || 0)

    // Calculate total leads that will be generated (25 per niche)
    const totalLeadsToGenerate = niches.length * LEADS_PER_NICHE
    
    // Find real businesses using Google Places API
    const realLeads = await findRealBusinesses(nicheData, location, totalLeadsToGenerate, LEADS_PER_NICHE)
    
    if (realLeads.length === 0) {
      return NextResponse.json({ 
        error: 'No real businesses found matching your criteria. Try expanding your search area or adjusting your niches.' 
      }, { status: 404 })
    }

    // Store leads in database
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

    // Use upsert to handle potential duplicates
    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .upsert(leadsToInsert, { 
        onConflict: 'user_id,business_name,email',
        ignoreDuplicates: false 
      })
      .select()

    if (insertError) {
      console.error('Error inserting leads:', insertError)
      return NextResponse.json({ error: 'Failed to save discovered leads' }, { status: 500 })
    }

    // Update usage tracking
    const newGenerationCount = (usageData?.generation_count || 0) + 1
    const newLeadsGenerated = (usageData?.leads_generated || 0) + insertedLeads.length

    if (usageData) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_usage')
        .update({
          generation_count: newGenerationCount,
          leads_generated: newLeadsGenerated,
          last_generation_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', localDate)

      if (updateError) {
        console.error('Error updating usage:', updateError)
      }
    } else {
      // Create new record
      const { error: insertUsageError } = await supabase
        .from('user_usage')
        .insert({
          user_id: userId,
          date: localDate,
          generation_count: 1,
          leads_generated: insertedLeads.length,
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
      leads_generated: LEADS_PER_NICHE
    }))

    const { error: nicheUsageUpdateError } = await supabase
      .from('user_niche_usage')
      .upsert(nicheUsageUpdates, {
        onConflict: 'user_id,niche_id'
      })

    if (nicheUsageUpdateError) {
      console.error('Error updating niche usage:', nicheUsageUpdateError)
    }

    return NextResponse.json({
      success: true,
      leads: insertedLeads,
      message: `Found ${insertedLeads.length} real businesses (${LEADS_PER_NICHE} per niche) with AI-enriched contact data`,
      generatedBy: 'Google Places API + ChatGPT Website Enrichment',
      leadsPerNiche: LEADS_PER_NICHE,
      usage: {
        used: newGenerationCount,
        limit: DAILY_GENERATION_LIMIT,
        leadsGenerated: insertedLeads.length,
        totalLeadsToday: newLeadsGenerated
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

async function findRealBusinesses(niches: any[], location: any, maxResults: number, resultsPerNiche: number) {
  const foundBusinesses: any[] = []
  
  for (const niche of niches) {
    if (foundBusinesses.length >= maxResults) break
    
    try {
      console.log(`Searching for ${niche.name} businesses in ${location.city}, ${location.state}`)
      
      // Construct search query based on niche and location
      const searchQuery = `${niche.name} in ${location.city}, ${location.state || ''}`
      const locationBias = location.city ? `${location.city}, ${location.state || ''}` : ''
      
      // Google Places Text Search API
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${locationBias}&radius=${(parseInt(location.radius) || 5) * 1609}&key=${process.env.GOOGLE_PLACES_API_KEY}`
      
      const placesResponse = await fetch(placesUrl)
      const placesData = await placesResponse.json()
      
      if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', placesData.status, placesData.error_message)
        continue
      }
      
      console.log(`Found ${placesData.results?.length || 0} places for ${niche.name}`)
      
      // Process businesses in parallel for faster processing
      const placesToProcess = (placesData.results || []).slice(0, resultsPerNiche)
      const businessPromises = placesToProcess.map(async (place: any) => {
        if (foundBusinesses.length >= maxResults) return null
        
        try {
          // Get detailed place information
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,business_status,rating,user_ratings_total,opening_hours,geometry&key=${process.env.GOOGLE_PLACES_API_KEY}`
          
          const detailsResponse = await fetch(detailsUrl)
          const detailsData = await detailsResponse.json()
          
          if (detailsData.status === 'OK' && detailsData.result) {
            const business = detailsData.result
            
            // Only include businesses that are currently operational
            if (business.business_status === 'OPERATIONAL') {
              const lead = await enrichBusinessData(business, niche, location)
              if (lead) {
                console.log(`Added real business: ${business.name}`)
                return lead
              }
            }
          }
        } catch (detailError: any) {
          console.log(`Error getting place details for ${place.name || 'unknown business'}: ${detailError.message || 'Unknown error'}`)
          return null
        }
        
        return null
      })

      // Wait for all businesses to be processed in parallel - use allSettled to continue even if some fail
      const processedBusinessResults = await Promise.allSettled(businessPromises)
      const processedBusinesses = processedBusinessResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => (result as PromiseFulfilledResult<any>).value)
      
      // Add successful results to foundBusinesses
      for (const business of processedBusinesses) {
        if (business && foundBusinesses.length < maxResults) {
          foundBusinesses.push(business)
        }
      }
      
    } catch (error) {
      console.error(`Error searching for ${niche.name}:`, error)
      continue
    }
  }
  
  return foundBusinesses
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
    
    // AI-powered website enrichment with timeout
    let enrichedData = {
      owner_name: null,
      email: null,
      instagram_handle: null,
      facebook_page: null,
      linkedin_profile: null,
      twitter_handle: null
    }
    
    if (website && process.env.OPENAI_API_KEY) {
      console.log(`Enriching data for ${name} using website: ${website}`)
      try {
        // Add timeout wrapper for AI enrichment (7 seconds max for faster processing)
        enrichedData = await Promise.race([
          enrichWithAI(name, website, location.city, location.state),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI enrichment timeout')), 7000)
          )
        ]) as any
      } catch (timeoutError: any) {
        console.log(`AI enrichment failed for ${name}: ${timeoutError.message || 'Unknown error'}, using basic data`)
      }
    }
    
    return {
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
    
  } catch (error) {
    console.error('Error enriching business data:', error)
    return null
  }
}

async function enrichWithAI(businessName: string, websiteUrl: string, city: string, state: string) {
  try {
    // First, try to fetch the website content with additional error handling
    const websiteContent = await scrapeWebsite(websiteUrl)
    
    if (!websiteContent) {
      console.log(`Could not scrape content from ${websiteUrl}, using basic business data`)
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
You are a data extraction specialist. I need you to analyze the following website content for a business and extract contact information.

Business: ${businessName}
Location: ${city}, ${state}
Website URL: ${websiteUrl}

Website Content:
${websiteContent.substring(0, 4000)} // Limit content to avoid token limits

Please extract the following information and return it as a valid JSON object only:
{
  "owner_name": "Owner or contact person name (if found)",
  "email": "Primary business email address (if found)",
  "instagram_handle": "Instagram username without @ (if found)",
  "facebook_page": "Facebook page name or URL (if found)",
  "linkedin_profile": "LinkedIn profile or company page URL (if found)",
  "twitter_handle": "Twitter/X username without @ (if found)"
}

IMPORTANT: 
- Return ONLY the JSON object, no markdown formatting, no backticks, no additional text
- Only extract information that is clearly visible on the website
- For email, look for contact@, info@, sales@, or owner emails
- For social media, look for handles, links, or mentions
- If not found, return null for that field
- Be conservative - only extract if you're confident it's correct
`

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
        console.log(`AI extracted data for ${businessName}:`, extractedData)
        return extractedData
      } catch (parseError) {
        console.log(`Error parsing AI response for ${businessName}, using basic data`)
      }
    }

  } catch (error: any) {
    if (error.code === 'insufficient_quota') {
      console.log(`OpenAI quota exceeded, using basic data for ${businessName}`)
    } else if (error.code === 'rate_limit_exceeded') {
      console.log(`OpenAI rate limit exceeded, using basic data for ${businessName}`)
    } else {
      console.log(`Error in AI enrichment for ${businessName}: ${error.message || 'Unknown error'}`)
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

    // Create abort controller for timeout - reduced to 3 seconds for faster processing
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 3000) // 3 second timeout

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
        console.log(`Access forbidden for ${url} (403) - site may block crawlers`)
      } else if (response.status === 404) {
        console.log(`Page not found for ${url} (404)`)
      } else {
        console.log(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }
      return null
    }

    const html = await response.text()
    
    // Basic HTML parsing to extract text content
    // Remove script and style tags
    const cleanHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()

    return cleanHtml

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log(`Request timeout for ${url}`)
    } else if (error.code === 'ENOTFOUND') {
      console.log(`Domain not found for ${url}`)
    } else if (error.code === 'ECONNREFUSED') {
      console.log(`Connection refused for ${url}`)
    } else if (error.message?.includes('fetch failed')) {
      console.log(`Fetch failed for ${url}: ${error.message}`)
    } else {
      console.log(`Error scraping ${url}: ${error.message || 'Unknown error'}`)
    }
    return null
  }
}

 
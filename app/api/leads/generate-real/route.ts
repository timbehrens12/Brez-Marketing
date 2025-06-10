import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

const supabase = getSupabaseServiceClient()

export async function POST(request: NextRequest) {
  try {
    const { businessType, niches, location, brandId, userId, maxResults = 10 } = await request.json()

    console.log('Real lead generation request:', { businessType, niches: niches?.length, location, brandId, userId, maxResults })

    if (!userId) {
      console.error('Authentication failed:', { userId: !!userId, brandId: !!brandId })
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
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

    const limitedResults = Math.min(maxResults, 20) // Max 20 to stay within API limits
    
    // Find real businesses using Google Places API
    const realLeads = await findRealBusinesses(nicheData, location, limitedResults)
    
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

    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting leads:', insertError)
      return NextResponse.json({ error: 'Failed to save discovered leads' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      leads: insertedLeads,
      message: `Found ${insertedLeads.length} real businesses in your area`,
      generatedBy: 'Google Places API + Real Data'
    })

  } catch (error) {
    console.error('Real lead generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error during real lead discovery' },
      { status: 500 }
    )
  }
}

async function findRealBusinesses(niches: any[], location: any, maxResults: number) {
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
      
      // Process each business found
      for (const place of (placesData.results || []).slice(0, Math.ceil(maxResults / niches.length))) {
        if (foundBusinesses.length >= maxResults) break
        
        // Get detailed place information
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,business_status,rating,user_ratings_total,opening_hours,geometry&key=${process.env.GOOGLE_PLACES_API_KEY}`
        
        try {
          const detailsResponse = await fetch(detailsUrl)
          const detailsData = await detailsResponse.json()
          
          if (detailsData.status === 'OK' && detailsData.result) {
            const business = detailsData.result
            
            // Only include businesses that are currently operational
            if (business.business_status === 'OPERATIONAL') {
              const lead = await enrichBusinessData(business, niche, location)
              if (lead) {
                foundBusinesses.push(lead)
                console.log(`Added real business: ${business.name}`)
              }
            }
          }
        } catch (detailError) {
          console.error('Error getting place details:', detailError)
          continue
        }
        
        // Rate limiting - pause between requests
        await new Promise(resolve => setTimeout(resolve, 100))
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
    
    // Note: owner_name and email would require additional APIs or web scraping
    const owner_name = null // Would need LinkedIn/company database lookup
    const email = null // Would need Hunter.io or similar email finder
    
    return {
      business_name: name,
      owner_name,
      email,
      phone,
      website,
      city,
      state_province: state,
      niche_name: niche.name
    }
    
  } catch (error) {
    console.error('Error enriching business data:', error)
    return null
  }
}

 
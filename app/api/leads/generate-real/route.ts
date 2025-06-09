import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/client'

const supabase = getSupabaseServiceClient()

export async function POST(request: NextRequest) {
  try {
    const { businessType, niches, location, brandId, userId, maxResults = 10 } = await request.json()

    console.log('Real lead generation request:', { businessType, niches: niches?.length, location, brandId, userId, maxResults })

    if (!userId || !brandId) {
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
    const leadsToInsert = realLeads.map((lead: any) => ({
      ...lead,
      user_id: userId,
      brand_id: brandId,
      business_type: businessType,
      status: 'new',
      priority: calculatePriority(lead.lead_score),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

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
    // Extract real data or mark as N/A
    const name = business.name || 'N/A'
    const address = business.formatted_address || 'N/A'
    const phone = business.formatted_phone_number || 'N/A'
    const website = business.website || 'N/A'
    const rating = business.rating || 0
    const reviewCount = business.user_ratings_total || 0
    
    // Parse address for city/state
    const addressParts = address.split(', ')
    const city = location.city || (addressParts.length > 1 ? addressParts[addressParts.length - 3] : 'N/A')
    const state = location.state || (addressParts.length > 1 ? addressParts[addressParts.length - 2]?.split(' ')[0] : 'N/A')
    
    // Try to find business owner/contact email (this would require additional APIs)
    const owner_name = 'N/A' // Would need LinkedIn/company database lookup
    const email = 'N/A' // Would need Hunter.io or similar email finder
    
    // Social media handles (would need social media APIs or web scraping)
    const instagram_handle = 'N/A'
    const facebook_page = 'N/A'
    const linkedin_profile = 'N/A'
    
    // Calculate lead score based on real factors
    let lead_score = 50 // Base score
    
    // Scoring factors based on real data
    if (website && website !== 'N/A') lead_score += 15 // Has website
    if (phone && phone !== 'N/A') lead_score += 10 // Has phone
    if (rating >= 4.0) lead_score += 10 // Good rating
    if (reviewCount >= 10) lead_score += 5 // Has reviews
    if (reviewCount >= 50) lead_score += 5 // Many reviews
    if (business.opening_hours?.open_now) lead_score += 5 // Currently open
    
    // Estimate revenue based on review count and rating (rough estimate)
    let estimated_revenue = 200000 // Base estimate
    if (reviewCount > 100) estimated_revenue = 500000
    if (reviewCount > 500) estimated_revenue = 1000000
    if (rating >= 4.5 && reviewCount > 50) estimated_revenue *= 1.5
    
    const ai_insights = generateRealInsights(business, rating, reviewCount, website !== 'N/A')
    
    return {
      business_name: name,
      owner_name,
      email,
      phone,
      website,
      city,
      state_province: state,
      address,
      instagram_handle,
      facebook_page,
      linkedin_profile,
      niche_name: niche.name,
      lead_score: Math.min(95, Math.max(40, Math.round(lead_score))),
      estimated_revenue,
      ai_insights,
      pain_points: getPainPointsByNiche(niche.name)
    }
    
  } catch (error) {
    console.error('Error enriching business data:', error)
    return null
  }
}

function generateRealInsights(business: any, rating: number, reviewCount: number, hasWebsite: boolean) {
  const insights = []
  
  if (!hasWebsite) {
    insights.push('No website - major digital presence opportunity')
  }
  
  if (rating < 4.0) {
    insights.push('Low rating - reputation management needed')
  } else if (rating >= 4.5) {
    insights.push('Excellent rating - leverage for marketing')
  }
  
  if (reviewCount < 10) {
    insights.push('Few reviews - review generation campaign needed')
  } else if (reviewCount > 100) {
    insights.push('Strong review presence - good social proof')
  }
  
  if (business.opening_hours?.open_now === false) {
    insights.push('Currently closed - check operating hours')
  }
  
  return insights.length > 0 ? insights.join('. ') : 'Established local business with growth potential'
}

function getPainPointsByNiche(nicheName: string) {
  const painPointMap: { [key: string]: string[] } = {
    'HVAC': ['Seasonal demand fluctuations', 'Emergency service competition'],
    'Plumbing': ['24/7 service expectations', 'Emergency response time pressure'],
    'Electrician': ['Safety compliance requirements', 'Technology upgrade demands'],
    'Auto Repair': ['Customer trust issues', 'Parts availability delays'],
    'Restaurant': ['High staff turnover', 'Food cost inflation'],
    'Fitness Studio': ['Member retention challenges', 'Equipment maintenance costs'],
    'Hair Salon': ['Appointment scheduling complexity', 'Product inventory management'],
    'Dentist': ['Insurance claim processing', 'Patient anxiety management'],
    'Veterinarian': ['Emergency case load', 'Pet owner emotional stress'],
    'Real Estate': ['Market volatility', 'Lead quality issues'],
    'Legal Services': ['Client acquisition costs', 'Case load management'],
    'Accounting': ['Tax season overload', 'Client data security'],
    'Cleaning Services': ['Staff reliability', 'Equipment maintenance'],
    'Landscaping': ['Weather dependency', 'Seasonal revenue drops'],
    'Pet Grooming': ['Difficult animals', 'Appointment no-shows'],
    'Photography': ['Seasonal booking patterns', 'Equipment investment costs']
  }
  
  return painPointMap[nicheName] || ['Customer acquisition challenges', 'Digital marketing gaps']
}

function calculatePriority(leadScore: number): string {
  if (leadScore >= 80) return 'high'
  if (leadScore >= 65) return 'medium'  
  return 'low'
} 
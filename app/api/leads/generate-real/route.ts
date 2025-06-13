import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { isSameDay } from 'date-fns'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
const PLACES_API_BASE_URL = 'https://places.googleapis.com/v1/places:searchText'
const DAILY_LEAD_GENERATION_LIMIT = 200
const LEADS_PER_NICHE = 20

interface Place {
  formattedAddress: string
  nationalPhoneNumber?: string
  displayName?: {
    text: string
  }
  addressComponents?: {
    longText: string
    types: string[]
  }[]
  websiteUri?: string
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('Google Places API key is not configured.')
    return NextResponse.json(
      { error: 'Google Places API not configured on the server.' },
      { status: 500 }
    )
  }

  const { niches, location, radius, brandId } = await req.json()

  if (!niches || niches.length === 0 || !location || !radius || !brandId) {
    return NextResponse.json({ error: 'Missing required parameters: niches, location, radius, and brandId must be provided.' }, { status: 400 })
  }

  // --- Usage Limit Check ---
  let usage = { leads_generated_today: 0, last_generation_date: new Date().toISOString() }
  const { data: userUsageData, error: usageError } = await supabase
    .from('user_lead_generation_usage')
    .select('leads_generated_today, last_generation_date')
    .eq('user_id', user.id)
    .single()

  if (usageError && usageError.code !== 'PGRST116') { // PGRST116: 'No rows found'
    console.error('Error fetching user usage:', usageError)
    return NextResponse.json({ error: 'Could not retrieve user usage data.' }, { status: 500 })
  }
  
  if (userUsageData) {
    // Check if we need to reset the daily count
    if (!isSameDay(new Date(userUsageData.last_generation_date), new Date())) {
      usage.leads_generated_today = 0
    } else {
      usage.leads_generated_today = userUsageData.leads_generated_today
    }
  }

  const requestedLeadsCount = niches.length * LEADS_PER_NICHE
  if (usage.leads_generated_today + requestedLeadsCount > DAILY_LEAD_GENERATION_LIMIT) {
    const remainingAllowance = DAILY_LEAD_GENERATION_LIMIT - usage.leads_generated_today
    return NextResponse.json({ 
      error: `Requesting ${requestedLeadsCount} leads would exceed your daily limit of ${DAILY_LEAD_GENERATION_LIMIT}. You have ${remainingAllowance > 0 ? remainingAllowance : 0} leads left for today.` 
    }, { status: 429 })
  }
  // --- End Usage Limit Check ---

  try {
    const allPlaces: Place[] = []
    for (const niche of niches) {
      const textQuery = `${niche} in ${location}`
      
      const requestBody = {
        textQuery,
        maxResultCount: LEADS_PER_NICHE,
        locationBias: {
          circle: {
            center: { latitude: location.lat, longitude: location.lng },
            radius: radius * 1609.34, // Convert miles to meters
          },
        },
      }

      const response = await fetch(PLACES_API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.addressComponents',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`Google Places API error for niche "${niche}":`, response.status, errorBody)
        continue
      }

      const data = await response.json()
      if (data.places) {
        allPlaces.push(...data.places)
      }
    }

    if (allPlaces.length === 0) {
      return NextResponse.json({ leads: [], message: 'No businesses found for the selected criteria.' })
    }
    
    const leadsToInsert = allPlaces.map((place) => {
      const address = place.formattedAddress || 'N/A'
      const city = place.addressComponents?.find(c => c.types.includes('locality'))?.longText
      const state = place.addressComponents?.find(c => c.types.includes('administrative_area_level_1'))?.longText
      const country = place.addressComponents?.find(c => c.types.includes('country'))?.longText

      return {
        brand_id: brandId,
        company_name: place.displayName?.text || 'N/A',
        phone_number: place.nationalPhoneNumber || 'N/A',
        website: place.websiteUri || 'N/A',
        address: address,
        city,
        state,
        country,
        niche: niches.join(', '),
        source: 'Google Places API',
        status: 'New',
      }
    })

    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select('*, initial_brand_id:brands(name)')

    if (insertError) {
      console.error('Error inserting leads:', insertError)
      return NextResponse.json({ error: 'Failed to save new leads to the database.' }, { status: 500 })
    }
    
    // --- Update Usage ---
    const newTotalLeads = usage.leads_generated_today + (insertedLeads?.length || 0)
    
    const { error: updateUsageError } = await supabase
      .from('user_lead_generation_usage')
      .upsert(
        { 
          user_id: user.id,
          leads_generated_today: newTotalLeads,
          last_generation_date: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )

    if (updateUsageError) {
      // Log the error but don't fail the request, as leads were already generated.
      console.error('Failed to update user usage count:', updateUsageError)
    }
    // --- End Update Usage ---

    return NextResponse.json({ leads: insertedLeads, newUsage: newTotalLeads })
  } catch (error) {
    console.error('Error during lead generation process:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

 
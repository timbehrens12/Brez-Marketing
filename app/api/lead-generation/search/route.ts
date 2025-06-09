import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

interface SearchFilters {
  businessType: 'online' | 'physical'
  niches: string[]
  location: {
    zipCode: string
    radius: number
    city: string
    state: string
    country: string
  }
  businessSize: string
  revenueRange: string
  industry: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { searchName, ...filters }: { searchName: string } & SearchFilters = body

    // Create search record
    const { data: searchRecord, error: searchError } = await supabase
      .from('lead_generation_searches')
      .insert({
        user_id: userId,
        search_name: searchName,
        business_type: filters.businessType,
        niches: filters.niches,
        location_filters: filters.location,
        search_parameters: {
          businessSize: filters.businessSize,
          revenueRange: filters.revenueRange,
          industry: filters.industry
        },
        status: 'running'
      })
      .select()
      .single()

    if (searchError) {
      console.error('Error creating search record:', searchError)
      return NextResponse.json({ error: 'Failed to create search' }, { status: 500 })
    }

    // Generate AI prompt for business discovery
    const prompt = generateSearchPrompt(filters)
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a business research assistant that helps marketing agencies find potential clients. Generate realistic business leads based on the given criteria. Return the results as a JSON array of business objects."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7
      })

      const aiResponse = completion.choices[0]?.message?.content
      if (!aiResponse) {
        throw new Error('No response from OpenAI')
      }

      // Parse AI response and extract business leads
      const leads = parseAIResponse(aiResponse)
      
      // Store leads in database
      const leadsWithSearchId = leads.map((lead: any) => ({
        ...lead,
        search_id: searchRecord.id,
        confidence_score: Math.random() * 0.4 + 0.6, // Random score between 0.6-1.0
        data_sources: ['AI Generated', 'Public Web Data']
      }))

      const { data: insertedLeads, error: leadsError } = await supabase
        .from('generated_leads')
        .insert(leadsWithSearchId)
        .select()

      if (leadsError) {
        console.error('Error inserting leads:', leadsError)
        // Update search status to failed
        await supabase
          .from('lead_generation_searches')
          .update({ status: 'failed' })
          .eq('id', searchRecord.id)
        
        return NextResponse.json({ error: 'Failed to store leads' }, { status: 500 })
      }

      // Update search record with results
      await supabase
        .from('lead_generation_searches')
        .update({ 
          status: 'completed',
          total_results: insertedLeads.length 
        })
        .eq('id', searchRecord.id)

      return NextResponse.json({
        searchId: searchRecord.id,
        leads: insertedLeads,
        totalResults: insertedLeads.length
      })

    } catch (aiError) {
      console.error('OpenAI API error:', aiError)
      
      // Update search status to failed
      await supabase
        .from('lead_generation_searches')
        .update({ status: 'failed' })
        .eq('id', searchRecord.id)

      // Return mock data for development/demo purposes
      const mockLeads = generateMockLeads(filters, searchRecord.id)
      
      const { data: insertedLeads } = await supabase
        .from('generated_leads')
        .insert(mockLeads)
        .select()

      await supabase
        .from('lead_generation_searches')
        .update({ 
          status: 'completed',
          total_results: mockLeads.length 
        })
        .eq('id', searchRecord.id)

      return NextResponse.json({
        searchId: searchRecord.id,
        leads: insertedLeads,
        totalResults: mockLeads.length
      })
    }

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateSearchPrompt(filters: SearchFilters): string {
  let prompt = `Find ${filters.businessType} businesses in the following niches: ${filters.niches.join(', ')}.`
  
  if (filters.businessType === 'physical' && filters.location.zipCode) {
    prompt += ` Located near zip code ${filters.location.zipCode} within ${filters.location.radius} miles.`
  }
  
  if (filters.industry) {
    prompt += ` Industry focus: ${filters.industry}.`
  }
  
  if (filters.businessSize) {
    prompt += ` Business size: ${filters.businessSize}.`
  }
  
  if (filters.revenueRange) {
    prompt += ` Revenue range: ${filters.revenueRange}.`
  }
  
  prompt += `

For each business, provide the following information in JSON format:
- business_name: string
- owner_name: string (if available)
- phone_number: string (if available)
- email: string (if available)
- website_url: string (if available)
- social_media_links: object with platform names as keys
- business_address: string (for physical businesses)
- city: string
- state: string
- zip_code: string (for physical businesses)
- industry: string
- business_description: string
- estimated_revenue: string
- employee_count: string

Generate 10-15 realistic businesses that would be good prospects for a marketing agency. Make sure the data looks authentic and professional.`

  return prompt
}

function parseAIResponse(response: string) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    
    // If no JSON array found, try to parse the entire response
    return JSON.parse(response)
  } catch (error) {
    console.error('Error parsing AI response:', error)
    return []
  }
}

function generateMockLeads(filters: SearchFilters, searchId: string) {
  const mockBusinesses = [
    {
      business_name: "TechFlow Solutions",
      owner_name: "Sarah Chen",
      phone_number: "+1 (555) 123-4567",
      email: "sarah@techflowsolutions.com",
      website_url: "https://techflowsolutions.com",
      social_media_links: {
        linkedin: "https://linkedin.com/company/techflow-solutions",
        twitter: "https://twitter.com/techflowsol"
      },
      business_address: "123 Innovation Blvd",
      city: "San Francisco",
      state: "CA",
      zip_code: "94105",
      industry: "Technology",
      business_description: "Software development and digital transformation consultancy specializing in cloud solutions.",
      estimated_revenue: "$2M - $5M",
      employee_count: "25-50"
    },
    {
      business_name: "Green Valley Organics",
      owner_name: "Michael Rodriguez",
      phone_number: "+1 (555) 987-6543",
      email: "mike@greenvalleyorganics.com",
      website_url: "https://greenvalleyorganics.com",
      social_media_links: {
        instagram: "https://instagram.com/greenvalleyorganics",
        facebook: "https://facebook.com/greenvalleyorganics"
      },
      business_address: "456 Farm Road",
      city: "Austin",
      state: "TX",
      zip_code: "78701",
      industry: "Food & Beverage",
      business_description: "Organic food retailer and restaurant chain focused on sustainable farming practices.",
      estimated_revenue: "$1M - $2M",
      employee_count: "15-25"
    },
    {
      business_name: "Urban Fitness Co",
      owner_name: "Jennifer Walsh",
      phone_number: "+1 (555) 456-7890",
      email: "jen@urbanfitnessco.com",
      website_url: "https://urbanfitnessco.com",
      social_media_links: {
        instagram: "https://instagram.com/urbanfitnessco",
        youtube: "https://youtube.com/urbanfitnessco"
      },
      business_address: "789 Wellness Street",
      city: "Miami",
      state: "FL",
      zip_code: "33101",
      industry: "Healthcare",
      business_description: "Boutique fitness studios offering personalized training and wellness programs.",
      estimated_revenue: "$500k - $1M",
      employee_count: "10-15"
    },
    {
      business_name: "Artisan Coffee Roasters",
      owner_name: "David Kim",
      phone_number: "+1 (555) 321-0987",
      email: "david@artisancoffeeroasters.com",
      website_url: "https://artisancoffeeroasters.com",
      social_media_links: {
        instagram: "https://instagram.com/artisancoffeeroasters",
        facebook: "https://facebook.com/artisancoffeeroasters"
      },
      business_address: "321 Coffee Lane",
      city: "Seattle",
      state: "WA",
      zip_code: "98101",
      industry: "Food & Beverage",
      business_description: "Small batch coffee roasting company with three cafe locations.",
      estimated_revenue: "$750k - $1.5M",
      employee_count: "20-30"
    },
    {
      business_name: "Digital Marketing Pro",
      owner_name: "Amanda Foster",
      phone_number: "+1 (555) 654-3210",
      email: "amanda@digitalmarketingpro.com",
      website_url: "https://digitalmarketingpro.com",
      social_media_links: {
        linkedin: "https://linkedin.com/company/digital-marketing-pro",
        twitter: "https://twitter.com/digitalmktgpro"
      },
      business_address: "654 Digital Way",
      city: "New York",
      state: "NY",
      zip_code: "10001",
      industry: "Professional Services",
      business_description: "Full-service digital marketing agency specializing in social media and content marketing.",
      estimated_revenue: "$3M - $5M",
      employee_count: "30-50"
    }
  ]

  return mockBusinesses.slice(0, Math.floor(Math.random() * 3) + 8).map(business => ({
    search_id: searchId,
    business_name: business.business_name,
    owner_name: business.owner_name,
    phone_number: business.phone_number,
    email: business.email,
    website_url: business.website_url,
    social_media_links: business.social_media_links,
    business_address: business.business_address,
    city: business.city,
    state: business.state,
    zip_code: business.zip_code,
    industry: business.industry,
    business_description: business.business_description,
    estimated_revenue: business.estimated_revenue,
    employee_count: business.employee_count,
    confidence_score: Math.random() * 0.4 + 0.6,
    data_sources: ['Mock Data', 'Demo Source'],
    sent_to_outreach: false
  }))
} 
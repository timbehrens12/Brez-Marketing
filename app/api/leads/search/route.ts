import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface SearchFilters {
  businessType: 'online' | 'local'
  selectedNiches: string[]
  location: {
    zipCode: string
    radius: number
    city: string
    state: string
    country: string
  }
  additionalFilters: {
    minEmployees: number
    maxEmployees: number
    minRevenue: number
    maxRevenue: number
    hasWebsite: boolean
    hasSocialMedia: boolean
    hasContactInfo: boolean
  }
}

function calculateLeadQualityScore(lead: any): number {
  let score = 50 // Base score

  // Contact information available
  if (lead.email) score += 15
  if (lead.phone) score += 15
  if (lead.website) score += 10

  // Social media presence
  if (lead.social_media?.facebook) score += 5
  if (lead.social_media?.instagram) score += 5
  if (lead.social_media?.linkedin) score += 5

  // Business information completeness
  if (lead.owner_name) score += 10
  if (lead.business_info?.description) score += 5
  if (lead.business_info?.employee_count > 10) score += 5

  // Ensure score is within bounds
  return Math.min(Math.max(score, 0), 100)
}

async function generateLeadsWithOpenAI(searchName: string, filters: SearchFilters): Promise<any[]> {
  const businessTypeText = filters.businessType === 'online' ? 'online e-commerce businesses' : 'local service businesses'
  const locationText = filters.businessType === 'local' 
    ? `in ${filters.location.city || filters.location.zipCode}, ${filters.location.state}` 
    : 'operating online'
  
  const nichesText = filters.selectedNiches.join(', ')
  
  const prompt = `Generate a list of 10-15 realistic ${businessTypeText} ${locationText} in the following niches: ${nichesText}.

For each business, provide the following information in JSON format:
- business_name: A realistic business name
- niche: One of the specified niches
- owner_name: A realistic owner/manager name (or null if not available)
- email: A realistic business email (or null if not available)
- phone: A realistic phone number (or null if not available)
- website: A realistic website URL (or null if not available)
- social_media: Object with facebook, instagram, linkedin URLs if available
- location: Object with city, state, country${filters.businessType === 'local' ? ', zipCode' : ''}
- business_info: Object with description, employee_count (1-500), estimated_revenue

Make the data realistic and varied. Some businesses should have complete information, others should be missing some contact details to simulate real-world lead generation.

${filters.additionalFilters.hasWebsite ? 'All businesses must have a website.' : ''}
${filters.additionalFilters.hasSocialMedia ? 'All businesses must have social media presence.' : ''}
${filters.additionalFilters.hasContactInfo ? 'All businesses must have email or phone contact information.' : ''}

Return only valid JSON array, no additional text.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a business research assistant that generates realistic business data for lead generation purposes. Always return valid JSON arrays."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.8,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    const businesses = JSON.parse(responseText)
    
    if (!Array.isArray(businesses)) {
      throw new Error('Invalid response format from OpenAI')
    }

    return businesses.map(business => ({
      ...business,
      business_type: filters.businessType,
      lead_quality_score: calculateLeadQualityScore(business),
      contact_status: 'not_contacted',
      is_sent_to_outreach: false
    }))

  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error('Failed to generate leads with AI')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchName, filters }: { searchName: string, filters: SearchFilters } = await request.json()

    // Validate required fields
    if (!searchName || !filters.businessType || !filters.selectedNiches.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate leads using OpenAI
    const generatedBusinesses = await generateLeadsWithOpenAI(searchName, filters)

    // Save search to database
    const { data: searchRecord, error: searchError } = await supabase
      .from('lead_searches')
      .insert({
        user_id: userId,
        search_name: searchName,
        business_type: filters.businessType,
        niches: filters.selectedNiches,
        location_filters: filters.location,
        additional_filters: filters.additionalFilters,
        search_parameters: filters,
        total_results: generatedBusinesses.length,
        status: 'completed'
      })
      .select()
      .single()

    if (searchError) {
      console.error('Error saving search:', searchError)
      return NextResponse.json({ error: 'Failed to save search' }, { status: 500 })
    }

    // Save generated leads to database
    const leadsToInsert = generatedBusinesses.map(business => ({
      search_id: searchRecord.id,
      user_id: userId,
      business_name: business.business_name,
      business_type: business.business_type,
      niche: business.niche,
      owner_name: business.owner_name,
      email: business.email,
      phone: business.phone,
      website: business.website,
      social_media: business.social_media || {},
      location: business.location || {},
      business_info: business.business_info || {},
      lead_quality_score: business.lead_quality_score,
      contact_status: business.contact_status,
      is_sent_to_outreach: business.is_sent_to_outreach
    }))

    const { data: savedLeads, error: leadsError } = await supabase
      .from('generated_leads')
      .insert(leadsToInsert)
      .select()

    if (leadsError) {
      console.error('Error saving leads:', leadsError)
      return NextResponse.json({ error: 'Failed to save leads' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      searchId: searchRecord.id,
      leads: savedLeads,
      totalFound: savedLeads.length
    })

  } catch (error) {
    console.error('Lead search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
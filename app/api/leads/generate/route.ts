import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { businessType, niches, location, keywords, brandId, maxResults = 20 } = body

    // Get niche details for AI context
    const { data: nicheData } = await supabase
      .from('lead_niches')
      .select('*')
      .in('id', niches)

    // Generate AI-powered lead insights
    const nicheNames = nicheData?.map(n => n.name).join(', ') || ''
    const locationString = businessType === 'local_service' 
      ? `${location.city || ''} ${location.state || ''} ${location.country || ''}`.trim()
      : 'online'

    // Use OpenAI to generate realistic lead data based on the criteria
    const prompt = `Generate ${maxResults} realistic business leads for ${businessType} businesses in the following niches: ${nicheNames}. 
    ${businessType === 'local_service' ? `Location: ${locationString}` : 'These are eCommerce businesses'}
    ${keywords ? `Additional keywords: ${keywords}` : ''}
    
    For each business, provide:
    - business_name (realistic business name)
    - owner_name (realistic person name)
    - email (realistic email address)
    - phone (realistic phone number)
    - website (realistic website URL)
    - address (if local service)
    - city, state_province, country
    - social media handles
    - estimated_revenue (realistic annual revenue estimate)
    - pain_points (3-5 marketing challenges they likely face)
    - ai_insights (why they would need Facebook ads help)
    - lead_score (1-100 based on likelihood to convert)
    
    Return as JSON array of lead objects.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a lead generation AI that creates realistic business prospects for marketing agencies. Generate diverse, realistic leads with proper contact information and business details."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
    })

    let aiLeads = []
    try {
      aiLeads = JSON.parse(completion.choices[0].message.content || '[]')
    } catch (error) {
      // Fallback to mock data if AI parsing fails
      aiLeads = generateMockLeads(businessType, nicheNames, locationString, maxResults)
    }

    // Process and save leads to database
    const leadsToInsert = aiLeads.slice(0, maxResults).map((lead: any) => ({
      user_id: userId,
      brand_id: brandId,
      business_name: lead.business_name,
      owner_name: lead.owner_name,
      email: lead.email,
      phone: lead.phone,
      website: lead.website,
      address: lead.address,
      city: lead.city,
      state_province: lead.state_province,
      country: lead.country || (businessType === 'local_service' ? location.country : 'USA'),
      instagram_handle: lead.instagram_handle,
      tiktok_handle: lead.tiktok_handle,
      facebook_page: lead.facebook_page,
      linkedin_profile: lead.linkedin_profile,
      business_type: businessType,
      niche_name: nicheData?.[0]?.name || nicheNames.split(',')[0],
      lead_score: lead.lead_score || Math.floor(Math.random() * 40) + 60,
      status: 'new',
      priority: lead.lead_score > 80 ? 'high' : lead.lead_score > 60 ? 'medium' : 'low',
      source: 'ai_generated',
      ai_insights: lead.ai_insights,
      pain_points: lead.pain_points || [],
      estimated_revenue: lead.estimated_revenue,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { data, error } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save leads' }, { status: 500 })
    }

    return NextResponse.json({ 
      leads: data,
      message: `Generated ${data?.length || 0} leads successfully`
    })

  } catch (error) {
    console.error('Lead generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate leads' },
      { status: 500 }
    )
  }
}

function generateMockLeads(businessType: string, niches: string, location: string, maxResults: number) {
  const mockLeads = []
  
  const ecommerceNames = ['StyleHub', 'FitGear Pro', 'GreenLife Store', 'TechTrends', 'BeautyBox']
  const localNames = ['Elite Dental', 'QuickFix Plumbing', 'Skyline HVAC', 'Prestige Law', 'Fresh Bites Cafe']
  
  const names = businessType === 'ecommerce' ? ecommerceNames : localNames
  const owners = ['Sarah Johnson', 'Mike Chen', 'Lisa Martinez', 'David Kim', 'Emma Wilson']
  
  for (let i = 0; i < Math.min(maxResults, 5); i++) {
    mockLeads.push({
      business_name: names[i] || `Business ${i + 1}`,
      owner_name: owners[i] || `Owner ${i + 1}`,
      email: `${names[i]?.toLowerCase().replace(/\s+/g, '') || `business${i + 1}`}@email.com`,
      phone: `+1 (555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      website: `https://${names[i]?.toLowerCase().replace(/\s+/g, '') || `business${i + 1}`}.com`,
      city: businessType === 'local_service' ? location.split(' ')[0] || 'Austin' : null,
      state_province: businessType === 'local_service' ? 'TX' : null,
      instagram_handle: `@${names[i]?.toLowerCase().replace(/\s+/g, '') || `business${i + 1}`}`,
      facebook_page: names[i] || `Business ${i + 1}`,
      lead_score: Math.floor(Math.random() * 40) + 60,
      ai_insights: `This ${businessType} business in the ${niches} niche has strong potential for Facebook ads growth.`,
      pain_points: ['Low online visibility', 'High customer acquisition cost', 'Poor ad performance'],
      estimated_revenue: Math.floor(Math.random() * 500000) + 100000
    })
  }
  
  return mockLeads
} 
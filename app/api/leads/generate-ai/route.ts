import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  timeout: 25000 // 25 second timeout
})

export async function POST(request: NextRequest) {
  try {
    const { businessType, niches, location, brandId, userId, maxResults = 10 } = await request.json()

    if (!userId || !brandId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Limit maxResults to prevent timeout
    const limitedResults = Math.min(maxResults, 8) // Max 8 leads to prevent timeout

    // Get niche details from database
    const { data: nicheData, error: nicheError } = await supabase
      .from('lead_niches')
      .select('*')
      .in('id', niches)
    
    if (nicheError) {
      console.error('Error fetching niches:', nicheError)
      return NextResponse.json({ error: 'Invalid niche selection' }, { status: 400 })
    }

    // Use OpenAI to generate realistic leads with timeout
    const aiGeneratedLeads = await Promise.race([
      generateLeadsWithOpenAI(businessType, nicheData, location, limitedResults),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 25000)
      )
    ]) as any[]
    
    if (aiGeneratedLeads.length === 0) {
      return NextResponse.json({ 
        error: 'No businesses found matching your criteria. Try adjusting your search parameters.' 
      }, { status: 404 })
    }

    // Store leads in database
    const leadsToInsert = aiGeneratedLeads.map((lead: any) => ({
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
      message: `AI discovered ${insertedLeads.length} high-potential businesses`,
      generatedBy: 'OpenAI GPT-4'
    })

  } catch (error) {
    console.error('AI Lead generation error:', error)
    
    // If timeout or OpenAI error, try fallback generation
    if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('OpenAI'))) {
      try {
        const { businessType, niches, location, brandId, userId, maxResults = 10 } = await request.json()
        const limitedResults = Math.min(maxResults, 8)
        
        const { data: nicheData } = await supabase
          .from('lead_niches')
          .select('*')
          .in('id', niches)
        
        const fallbackLeads = generateFallbackLeads(businessType, nicheData || [], location, limitedResults)
        
        const leadsToInsert = fallbackLeads.map((lead: any) => ({
          ...lead,
          user_id: userId,
          brand_id: brandId,
          business_type: businessType,
          status: 'new',
          priority: calculatePriority(lead.lead_score),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { data: insertedLeads } = await supabase
          .from('leads')
          .insert(leadsToInsert)
          .select()

        return NextResponse.json({
          success: true,
          leads: insertedLeads || [],
          message: `Generated ${(insertedLeads || []).length} sample businesses (AI temporarily unavailable)`,
          generatedBy: 'Fallback Algorithm'
        })
      } catch (fallbackError) {
        console.error('Fallback generation failed:', fallbackError)
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error during AI lead discovery' },
      { status: 500 }
    )
  }
}

async function generateLeadsWithOpenAI(
  businessType: string,
  niches: any[],
  location: any,
  maxResults: number
) {
  const nicheNames = niches.map(n => n.name).join(', ')
  const locationStr = location.city ? `${location.city}, ${location.state || ''}` : 'United States'
  
  // Simplified prompt to reduce response time
  const prompt = `Generate ${maxResults} realistic ${businessType} businesses in ${locationStr} for industries: ${nicheNames}.

Return ONLY valid JSON array:
[
  {
    "business_name": "realistic business name",
    "owner_name": "owner full name", 
    "email": "email@business.com",
    "phone": "+1-555-123-4567",
    "website": "https://website.com",
    "city": "${location.city || 'New York'}",
    "state_province": "${location.state || 'NY'}",
    "address": "street address",
    "instagram_handle": "@handle",
    "facebook_page": "BusinessName", 
    "linkedin_profile": "business-name",
    "niche_name": "pick from: ${nicheNames}",
    "lead_score": 75,
    "estimated_revenue": 250000,
    "ai_insights": "brief marketing opportunity",
    "pain_points": ["issue 1", "issue 2"],
    "recent_activity": "recent business news",
    "verification_status": "verified"
  }
]

Make businesses realistic but keep responses concise.`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Use faster model
      messages: [
        {
          role: "system",
          content: "Generate realistic business data. Be concise but authentic. Return only valid JSON."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 2000, // Reduced tokens
      temperature: 0.7
    })

    const aiResponse = response.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Parse the JSON response
    let leads
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse
      leads = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', aiResponse)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Validate and clean the leads
    const validLeads = leads.filter((lead: any) => 
      lead.business_name && 
      lead.email && 
      lead.lead_score >= 40 && 
      lead.lead_score <= 95
    ).map((lead: any) => ({
      ...lead,
      lead_score: Math.min(95, Math.max(40, Math.round(lead.lead_score))),
      estimated_revenue: Math.max(50000, Math.round(lead.estimated_revenue || 200000)),
      pain_points: Array.isArray(lead.pain_points) ? lead.pain_points : [],
      verification_status: 'ai_generated'
    }))

    return validLeads

  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error // Re-throw to trigger fallback
  }
}

function generateFallbackLeads(businessType: string, niches: any[], location: any, maxResults: number) {
  // Generate sample leads when OpenAI is unavailable
  const sampleBusinessNames = {
    ecommerce: ['TrendCraft Co', 'DigitalDrop Store', 'EcoStyle Shop', 'TechHub Direct'],
    'local-services': ['Premier Cleaners', 'Elite Fitness Studio', 'Comfort HVAC', 'Sparkle Dental']
  }
  
  const names = sampleBusinessNames[businessType as keyof typeof sampleBusinessNames] || ['Sample Business']
  const niche = niches[0]?.name || 'General'
  
  return Array.from({ length: Math.min(maxResults, 4) }, (_, i) => ({
    business_name: `${names[i % names.length]} ${i + 1}`,
    owner_name: `Business Owner ${i + 1}`,
    email: `contact@business${i + 1}.com`,
    phone: `+1-555-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    website: `https://business${i + 1}.com`,
    city: location.city || 'New York',
    state_province: location.state || 'NY',
    address: `${123 + i} Main Street`,
    instagram_handle: `@business${i + 1}`,
    facebook_page: `Business${i + 1}`,
    linkedin_profile: `business-${i + 1}`,
    niche_name: niche,
    lead_score: Math.floor(Math.random() * 25) + 65, // 65-90
    estimated_revenue: Math.floor(Math.random() * 500000) + 100000,
    ai_insights: 'Sample business generated during high traffic',
    pain_points: ['Customer acquisition', 'Digital marketing'],
    recent_activity: 'Recently updated business profile',
    verification_status: 'sample_data'
  }))
}

function calculatePriority(leadScore: number): string {
  if (leadScore >= 80) return 'high'
  if (leadScore >= 65) return 'medium'  
  return 'low'
} 
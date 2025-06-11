import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { selectedNiches, brandId } = await request.json();

    if (!selectedNiches || selectedNiches.length === 0) {
      return NextResponse.json({ error: 'No niches selected' }, { status: 400 });
    }

    // supabase is already imported as a singleton

    // Get niche names from IDs
    const { data: niches } = await supabase
      .from('lead_niches')
      .select('name')
      .in('id', selectedNiches);

    const nicheNames = niches?.map((n: any) => n.name) || [];

    // Use ChatGPT to find low-key ecommerce brands
    const prompt = `You are an expert at finding emerging ecommerce brands that would be perfect prospects for digital marketing agencies. 

Find 10 real, low-key online brands in these niches: ${nicheNames.join(', ')}

Focus on brands that:
- Have 1k-50k Instagram followers (not too big, not too small)
- Are likely spending some money on ads but could do better
- Have active social media presence
- Appear to be generating revenue but aren't huge corporations
- Would be good prospects for a marketing agency

For each brand, provide:
- Business name
- Owner/founder name (if findable)
- Instagram handle (@username)
- TikTok handle (if they have one)
- Website URL
- Email (try to find contact email)
- Estimated monthly revenue range
- Estimated Instagram follower count
- Primary niche category
- Brief reason why they'd be a good marketing prospect

Format as JSON array with this structure:
[
  {
    "business_name": "",
    "owner_name": "",
    "instagram_handle": "",
    "tiktok_handle": "",
    "website": "",
    "email": "",
    "monthly_revenue_estimate": "",
    "follower_count_instagram": 0,
    "niche_name": "",
    "marketing_prospect_reason": ""
  }
]

Only return the JSON array, no other text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    let brandsData;
    try {
      brandsData = JSON.parse(completion.choices[0].message.content || '[]');
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    if (!Array.isArray(brandsData) || brandsData.length === 0) {
      return NextResponse.json({ error: 'No brands found' }, { status: 404 });
    }

    // Insert leads into database
    const leadsToInsert = brandsData.map((brand: any) => ({
      brand_id: brandId,
      business_name: brand.business_name || 'Unknown Business',
      owner_name: brand.owner_name || null,
      email: brand.email || null,
      website: brand.website || null,
      business_type: 'ecommerce',
      niche_name: brand.niche_name || nicheNames[0],
      instagram_handle: brand.instagram_handle?.replace('@', '') || null,
      tiktok_handle: brand.tiktok_handle?.replace('@', '') || null,
      monthly_revenue_estimate: brand.monthly_revenue_estimate || null,
      follower_count_instagram: brand.follower_count_instagram || null,
      marketing_prospect_reason: brand.marketing_prospect_reason || null,
      shopify_detected: brand.website?.includes('shopify') || brand.website?.includes('.myshopify.com') || false,
      lead_score: Math.floor(Math.random() * 40) + 60, // 60-100 score for AI-found leads
    }));

    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save leads' }, { status: 500 });
    }

    return NextResponse.json({ 
      leads: insertedLeads,
      message: `Found ${insertedLeads?.length || 0} ecommerce brands`
    });

  } catch (error) {
    console.error('Error generating ecommerce leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
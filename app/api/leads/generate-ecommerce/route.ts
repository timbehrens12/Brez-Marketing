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

    // Get niche names from IDs
    const { data: niches } = await supabase
      .from('lead_niches')
      .select('name')
      .in('id', selectedNiches);

    const nicheNames = niches?.map((n: any) => n.name) || [];

    const prompt = `You are a market research assistant helping identify business opportunities in ecommerce.

Generate 10 example ecommerce business profiles for market research purposes in these categories: ${nicheNames.join(', ')}

Create realistic but fictional business profiles with these characteristics:
- Small to medium-sized online businesses
- Active on social media platforms
- Appear to have growth potential
- Suitable for digital marketing case studies

For each profile, provide:
- Business name (make it realistic but fictional)
- Owner/founder name (fictional)
- Instagram handle (@username format)
- TikTok handle (if applicable)
- Website URL (.com format)
- Contact email
- Estimated monthly revenue range
- Estimated Instagram follower count (1k-50k range)
- Primary category from the provided niches
- Brief marketing opportunity note

Return ONLY a valid JSON array with this exact structure:
[
  {
    "business_name": "Example Business",
    "owner_name": "John Doe",
    "instagram_handle": "examplebusiness",
    "tiktok_handle": "examplebusiness_official",
    "website": "https://examplebusiness.com",
    "email": "hello@examplebusiness.com",
    "monthly_revenue_estimate": "$15k-35k",
    "follower_count_instagram": 12500,
    "niche_name": "Apparel",
    "marketing_prospect_reason": "Active social presence with growth potential"
  }
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0].message.content || '';
    
    // Try to extract JSON from the response
    let jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in OpenAI response:', responseContent);
      return NextResponse.json({ error: 'AI failed to return valid data format' }, { status: 500 });
    }

    let brandsData;
    try {
      brandsData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Response content:', responseContent);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Validate the parsed data
    if (!Array.isArray(brandsData) || brandsData.length === 0) {
      console.error('Invalid data from OpenAI:', brandsData);
      return NextResponse.json({ error: 'AI returned invalid or empty data' }, { status: 500 });
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
      message: `Generated ${insertedLeads?.length || 0} ecommerce leads`
    });

  } catch (error) {
    console.error('Error generating ecommerce leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
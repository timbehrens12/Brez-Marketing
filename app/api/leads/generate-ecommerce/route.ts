import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { selectedNiches, brandId, userId } = await request.json();

    if (!selectedNiches || selectedNiches.length === 0) {
      return NextResponse.json({ error: 'No niches selected' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    // Get niche names from IDs
    const { data: niches } = await supabase
      .from('lead_niches')
      .select('name')
      .in('id', selectedNiches);

    const nicheNames = niches?.map((n: any) => n.name) || [];

    const prompt = `You are a lead generation specialist helping find real small businesses that would be good prospects for digital marketing services.

Generate 5 realistic small business leads in these categories: ${nicheNames.join(', ')}

Create profiles that represent REAL types of small businesses with these characteristics:
- Small businesses (1-50 employees) that actually exist in these industries
- Have social media presence (Instagram 500-10K followers, TikTok if relevant)
- Would benefit from digital marketing/advertising services
- Realistic business names that sound authentic for their niche
- Proper social media handles that match the business type

IMPORTANT RULES:
- If you don't have real information for a field, use "N/A" - NO fake filler data
- Social media handles should be realistic for the business type
- Business names should sound authentic and professional
- Focus on businesses that would actually need marketing help

For each business, provide:
- business_name: Realistic name for the niche (e.g., "Sunset Streetwear" for apparel)
- owner_name: Realistic founder name or "N/A"
- instagram_handle: Handle that matches business (without @) or "N/A"
- tiktok_handle: Handle if relevant to niche (without @) or "N/A"
- twitter_handle: Handle if relevant (without @) or "N/A"
- website: Realistic .com domain or "N/A"
- email: Professional email or "N/A"
- phone: Business phone or "N/A"
- location: City, State format or "N/A"
- niche_name: Must match one of the provided niches exactly

Example for Apparel niche:
{
  "business_name": "Urban Thread Co",
  "owner_name": "Sarah Martinez",
  "instagram_handle": "urbanthreadco",
  "tiktok_handle": "urbanthreadco",
  "twitter_handle": "N/A",
  "website": "https://urbanthreadco.com",
  "email": "hello@urbanthreadco.com",
  "phone": "N/A",
  "location": "Austin, TX",
  "niche_name": "Apparel"
}

Return ONLY a valid JSON array with exactly this structure:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1500,
    }, {
      timeout: 20000, // 20 second timeout
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

    // Insert leads into database with proper N/A handling
    const leadsToInsert = brandsData.map((brand: any) => ({
      user_id: userId,
      brand_id: brandId,
      business_name: brand.business_name || 'Unknown Business',
      owner_name: brand.owner_name === 'N/A' ? null : brand.owner_name,
      email: brand.email === 'N/A' ? null : brand.email,
      phone: brand.phone === 'N/A' ? null : brand.phone,
      website: brand.website === 'N/A' ? null : brand.website,
      location: brand.location === 'N/A' ? null : brand.location,
      business_type: 'ecommerce',
      niche_name: brand.niche_name || nicheNames[0],
      instagram_handle: brand.instagram_handle === 'N/A' ? null : brand.instagram_handle?.replace('@', ''),
      tiktok_handle: brand.tiktok_handle === 'N/A' ? null : brand.tiktok_handle?.replace('@', ''),
      twitter_handle: brand.twitter_handle === 'N/A' ? null : brand.twitter_handle?.replace('@', ''),
      status: 'new',
      lead_score: Math.floor(Math.random() * 30) + 60, // Score between 60-90 for quality leads
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
      message: `Generated ${insertedLeads?.length || 0} high-quality ecommerce leads`
    });

  } catch (error) {
    console.error('Error generating ecommerce leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
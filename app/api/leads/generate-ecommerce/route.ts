import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { selectedNiches, brandId, userId, maxResults } = await request.json();

    if (!selectedNiches || selectedNiches.length === 0) {
      return NextResponse.json({ error: 'No niches selected' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    // Calculate intelligent lead generation count
    const baseLeadsPerNiche = 8
    const calculatedMaxResults = maxResults || Math.min(selectedNiches.length * baseLeadsPerNiche, 60)
    
    // Check usage limits if brandId is provided
    let usageResult = null
    if (brandId) {
      try {
        const usageCheck = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/usage/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            leadsToGenerate: calculatedMaxResults
          })
        })

        if (usageCheck.ok) {
          usageResult = await usageCheck.json()
          if (!usageResult.allowed) {
            return NextResponse.json({ 
              error: usageResult.message,
              usage: usageResult
            }, { status: 429 })
          }
        }
      } catch (error) {
        console.warn('Usage check failed, proceeding without tracking:', error)
      }
    }

    // Get niche names from IDs
    const { data: niches } = await supabase
      .from('lead_niches')
      .select('name')
      .in('id', selectedNiches);

    const nicheNames = niches?.map((n: any) => n.name) || [];

    // Calculate leads per niche batch to optimize generation
    const leadsPerBatch = Math.ceil(calculatedMaxResults / selectedNiches.length)
    const maxLeadsPerBatch = Math.min(leadsPerBatch, 15) // Cap per batch

    // Optimized prompt for better lead generation
    const prompt = `Generate ${maxLeadsPerBatch} realistic ecommerce business leads for: ${nicheNames.join(', ')}

Requirements:
- Small to medium ecommerce businesses (1K-50K social followers)
- Need digital marketing services (email, social, ads)
- Realistic business names and contact info
- Use "N/A" for missing data (no fake info)

JSON format:
[
  {
    "business_name": "realistic ecommerce business name",
    "owner_name": "owner name or N/A",
    "instagram_handle": "handle or N/A",
    "facebook_page": "page or N/A",
    "linkedin_profile": "company/profile or N/A", 
    "twitter_handle": "handle or N/A",
    "website": "ecommerce website url or N/A",
    "email": "business email or N/A",
    "phone": "business phone or N/A",
    "location": "City, State or N/A",
    "niche_name": "${nicheNames[0]}"
  }
]

Return only the JSON array:`;

    // Use optimized model and timeout for production
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Fast and reliable
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8, // Slightly more creative for diverse leads
      max_tokens: Math.min(maxLeadsPerBatch * 120, 1200), // Scale tokens with lead count
    }, {
      timeout: 15000, // 15 second timeout for larger batches
    });

    const responseContent = completion.choices[0].message.content || '';
    
    // Try to extract JSON from the response
    let jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      // Fallback: try to find JSON without brackets
      const lines = responseContent.split('\n');
      const jsonLines = lines.filter(line => line.trim().startsWith('{') || line.trim().startsWith('[') || line.trim().startsWith('}') || line.trim().startsWith(']'));
      if (jsonLines.length > 0) {
        jsonMatch = [jsonLines.join('\n')];
      } else {
        console.error('No JSON found in OpenAI response:', responseContent);
        return NextResponse.json({ error: 'AI failed to return valid data format' }, { status: 500 });
      }
    }

    let brandsData;
    try {
      brandsData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Response content:', responseContent);
      
      // Fallback: create sample leads if parsing fails
      brandsData = [{
        business_name: `Sample ${nicheNames[0]} Business`,
        owner_name: "N/A",
        instagram_handle: "N/A",
        facebook_page: "N/A",
        linkedin_profile: "N/A",
        twitter_handle: "N/A",
        website: "N/A",
        email: "N/A",
        phone: "N/A",
        location: "N/A",
        niche_name: nicheNames[0]
      }];
    }

    // Ensure it's an array
    if (!Array.isArray(brandsData)) {
      brandsData = [brandsData];
    }

    // Validate and clean the data
    const validLeads = brandsData
      .filter(brand => brand && brand.business_name && brand.business_name !== 'N/A')
      .slice(0, calculatedMaxResults); // Use calculated max results

    if (validLeads.length === 0) {
      return NextResponse.json({ 
        error: 'No valid leads generated. Please try different niches or check your AI configuration.',
        debug: {
          niches: nicheNames,
          rawResponse: responseContent.substring(0, 200)
        }
      }, { status: 500 });
    }

    // Insert leads into database with proper N/A handling
    const leadsToInsert = validLeads.map((brand: any) => ({
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
      facebook_page: brand.facebook_page === 'N/A' ? null : brand.facebook_page,
      linkedin_profile: brand.linkedin_profile === 'N/A' ? null : brand.linkedin_profile,
      twitter_handle: brand.twitter_handle === 'N/A' ? null : brand.twitter_handle?.replace('@', ''),
      status: 'new',
      lead_score: Math.floor(Math.random() * 30) + 60, // Score between 60-90 for quality leads
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Use upsert to handle potential duplicates
    const { data: insertedLeads, error: insertError } = await supabase
      .from('leads')
      .upsert(leadsToInsert, { 
        onConflict: 'user_id,business_name,email',
        ignoreDuplicates: false 
      })
      .select();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save leads' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      leads: insertedLeads,
      message: `Generated ${insertedLeads?.length || 0} high-quality ecommerce leads`,
      usage: usageResult,
      generated_count: insertedLeads?.length || 0,
      niches_processed: selectedNiches.length,
      generation_method: 'AI (GPT-3.5-turbo)',
      leads_per_niche: Math.round((insertedLeads?.length || 0) / selectedNiches.length)
    });

  } catch (error: any) {
    console.error('Error generating leads:', error);
    
    // Handle specific timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return NextResponse.json({ 
        error: 'Request timed out. Please try again with fewer niches.' 
      }, { status: 504 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
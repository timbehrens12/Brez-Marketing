import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Validate required fields (new spec structure)
    if (!data.business_name || !data.first_name || !data.last_name || !data.contact_email || !data.contact_phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!data.consent_accepted) {
      return NextResponse.json(
        { error: 'Consent is required' },
        { status: 400 }
      )
    }

    // Use first_name and last_name directly
    const firstName = data.first_name || ''
    const lastName = data.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim()

    // Format email content (using new field names)
    const emailBody = `
🎉 NEW CLIENT ONBOARDING RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 BUSINESS INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Name: ${data.business_name}
Owner: ${fullName}
Email: ${data.contact_email}
Phone: ${data.contact_phone}
City: ${data.business_city}
State: ${data.business_state}
Years in Service: ${data.years_in_service}
Business Type: ${data.business_type}

Services: ${(data.services_primary || []).join(', ')}
${data.services_secondary ? `Other Services: ${data.services_secondary}` : ''}

Market Type: ${data.market_type}
Service Areas: ${(data.service_areas || []).join(', ')}

About: ${data.about_text}
${data.tagline ? `Tagline: ${data.tagline}` : ''}

Site Contact:
Phone: ${data.site_phone}
Email: ${data.site_email}
Preferred Contact: ${data.preferred_contact}

Business Hours:
${data.business_hours ? Object.entries(data.business_hours).map(([day, hours]: [string, any]) => 
  `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}`
).join('\n') : '—'}

Social:
${data.facebook_url ? `Facebook: ${data.facebook_url}` : ''}
${data.instagram_url ? `Instagram: ${data.instagram_url}` : ''}
${data.google_profile_url ? `Google Business: ${data.google_profile_url}` : ''}

Domain:
Has Domain: ${data.has_domain}
${data.has_domain === 'Yes' ? `Current: ${data.domain_current}` : ''}
${data.has_domain === 'No' ? `Request Purchase: ${data.request_domain_purchase}` : ''}
${data.domain_preferences ? `Preferences: ${data.domain_preferences}` : ''}

${data.internal_notes ? `Notes: ${data.internal_notes}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
    `.trim()

    // Save to Supabase (using new field names from spec)
    const { data: savedData, error: dbError } = await supabase
      .from('onboarding_submissions')
      .insert({
        business_name: data.business_name,
        contact_name: fullName,
        business_email: data.contact_email,
        business_phone: data.contact_phone,
        business_city: data.business_city,
        business_state: data.business_state,
        years_in_service: data.years_in_service,
        business_type: data.business_type,
        services_primary: data.services_primary || [],
        services_secondary: data.services_secondary,
        market_type: data.market_type,
        service_areas: data.service_areas || [],
        logo_url: data.logo_url,
        gallery_urls: data.gallery_urls || [],
        brand_colors: data.brand_colors,
        design_constraints: data.design_constraints,
        about_text: data.about_text,
        tagline: data.tagline,
        site_phone: data.site_phone,
        site_email: data.site_email,
        business_hours: data.business_hours,
        preferred_contact: data.preferred_contact,
        facebook_url: data.facebook_url,
        instagram_url: data.instagram_url,
        google_profile_url: data.google_profile_url,
        has_domain: data.has_domain,
        domain_current: data.domain_current,
        request_domain_purchase: data.request_domain_purchase,
        domain_preferences: data.domain_preferences,
        internal_notes: data.internal_notes,
        consent_accepted: data.consent_accepted,
        form_id: data.form_id,
        source: data.source,
        submitted_at: data.submitted_at,
      })
      .select()

    if (dbError) {
      console.error('Supabase error:', dbError)
      throw new Error('Failed to save to database')
    }

    console.log('✅ Saved to Supabase:', savedData?.[0]?.id)

    // Sync to GoHighLevel (if credentials are configured)
    let ghlContactId = null
    let ghlOpportunityId = null
    
    if (process.env.GOHIGHLEVEL_API_KEY && process.env.GOHIGHLEVEL_LOCATION_ID) {
      try {
        // Create/Update Contact in GoHighLevel
        const ghlContactResponse = await fetch(`https://rest.gohighlevel.com/v1/contacts/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locationId: process.env.GOHIGHLEVEL_LOCATION_ID,
            firstName: firstName,
            lastName: lastName,
            email: data.contact_email,
            phone: data.contact_phone,
            companyName: data.business_name,
            city: data.business_city,
            state: data.business_state,
            source: 'stripe_onboarding_site',
            tags: ['Onboarding', 'Website Build'],
            customFields: [
              { key: 'services_primary', value: (data.services_primary || []).join(', ') },
              { key: 'service_areas', value: (data.service_areas || []).join(', ') },
              { key: 'business_type', value: data.business_type || '' },
              { key: 'years_in_service', value: data.years_in_service || '' },
            ],
          }),
        })

        if (ghlContactResponse.ok) {
          const ghlContact = await ghlContactResponse.json()
          ghlContactId = ghlContact.contact?.id || ghlContact.id
          console.log('✅ Created GoHighLevel contact:', ghlContactId)

          // Create Opportunity in GoHighLevel Pipeline
          if (process.env.GOHIGHLEVEL_PIPELINE_ID) {
            const ghlOpportunityResponse = await fetch(`https://rest.gohighlevel.com/v1/opportunities/`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                locationId: process.env.GOHIGHLEVEL_LOCATION_ID,
                pipelineId: process.env.GOHIGHLEVEL_PIPELINE_ID,
                pipelineStageId: process.env.GOHIGHLEVEL_STAGE_ID || undefined,
                name: `Website Build - ${data.business_name}`,
                contactId: ghlContactId,
                monetaryValue: 0, // You can set a default value or get from env
                status: 'open',
                source: 'Onboarding Form',
                notes: emailBody, // Use the formatted email body as notes
              }),
            })

            if (ghlOpportunityResponse.ok) {
              const ghlOpportunity = await ghlOpportunityResponse.json()
              ghlOpportunityId = ghlOpportunity.opportunity?.id || ghlOpportunity.id
              console.log('✅ Created GoHighLevel opportunity:', ghlOpportunityId)
            }
          }

          // Update Supabase with GoHighLevel IDs
          await supabase
            .from('onboarding_submissions')
            .update({
              ghl_contact_id: ghlContactId,
              ghl_opportunity_id: ghlOpportunityId,
              ghl_synced_at: new Date().toISOString(),
            })
            .eq('id', savedData?.[0]?.id)
        }
      } catch (ghlError) {
        console.error('GoHighLevel sync error (non-fatal):', ghlError)
        // Don't fail the whole request if GHL sync fails
      }
    }

    // Send to GoHighLevel webhook (if configured) - send payload as-is per spec
    if (process.env.GOHIGHLEVEL_WEBHOOK_URL) {
      try {
        await fetch(process.env.GOHIGHLEVEL_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.contact_email,
            phone: data.contact_phone,
            companyName: data.business_name,
            city: data.business_city,
            state: data.business_state,
            source: data.source || 'stripe_onboarding_site',
            
            // Send all data according to spec (payload already formatted correctly)
            ...data,
          }),
        })
        console.log('✅ Sent to GoHighLevel webhook')
      } catch (ghlWebhookError) {
        console.error('GoHighLevel webhook error (non-fatal):', ghlWebhookError)
        // Don't fail the whole request if GHL webhook fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding submitted successfully',
      id: savedData?.[0]?.id,
    })

  } catch (error) {
    console.error('Onboarding submission error:', error)
    return NextResponse.json(
      { error: 'Failed to process onboarding' },
      { status: 500 }
    )
  }
}


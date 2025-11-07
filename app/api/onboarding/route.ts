import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Validate required fields based on new spec
    if (!data.business_name || !data.owner_name || !data.contact_email || !data.contact_phone) {
      return NextResponse.json(
        { error: 'Missing required fields: business_name, owner_name, contact_email, contact_phone' },
        { status: 400 }
      )
    }

    if (!data.business_city || !data.business_state || !data.years_in_service || !data.business_type) {
      return NextResponse.json(
        { error: 'Missing required fields: business_city, business_state, years_in_service, business_type' },
        { status: 400 }
      )
    }

    if (!data.services_primary || data.services_primary.length === 0) {
      return NextResponse.json(
        { error: 'At least one service must be selected' },
        { status: 400 }
      )
    }

    if (!data.market_type || !data.service_areas || data.service_areas.length === 0) {
      return NextResponse.json(
        { error: 'Market type and at least one service area required' },
        { status: 400 }
      )
    }

    if (!data.about_text) {
      return NextResponse.json(
        { error: 'About text is required' },
        { status: 400 }
      )
    }

    if (!data.site_phone || !data.site_email || !data.preferred_contact) {
      return NextResponse.json(
        { error: 'Site contact details required' },
        { status: 400 }
      )
    }

    if (!data.has_domain) {
      return NextResponse.json(
        { error: 'Domain ownership status required' },
        { status: 400 }
      )
    }

    if (!data.consent_accepted) {
      return NextResponse.json(
        { error: 'Consent must be accepted' },
        { status: 400 }
      )
    }

    // Parse owner_name into firstName and lastName for GHL
    const ownerNameParts = data.owner_name.trim().split(' ')
    const firstName = ownerNameParts[0] || ''
    const lastName = ownerNameParts.slice(1).join(' ') || ''

    // Save to Supabase (using new field names)
    const { data: savedData, error: dbError } = await supabase
      .from('onboarding_submissions')
      .insert({
        business_name: data.business_name,
        owner_name: data.owner_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        business_city: data.business_city,
        business_state: data.business_state,
        years_in_service: data.years_in_service,
        business_type: data.business_type,
        services_primary: data.services_primary || [],
        services_secondary: data.services_secondary || '',
        market_type: data.market_type,
        service_areas: data.service_areas || [],
        logo_url: data.logo_url || '',
        gallery_urls: data.gallery_urls || [],
        brand_colors: data.brand_colors || '',
        design_constraints: data.design_constraints || '',
        about_text: data.about_text,
        tagline: data.tagline || '',
        site_phone: data.site_phone,
        site_email: data.site_email,
        business_hours: data.business_hours || {},
        preferred_contact: data.preferred_contact,
        facebook_url: data.facebook_url || '',
        instagram_url: data.instagram_url || '',
        google_profile_url: data.google_profile_url || '',
        has_domain: data.has_domain,
        domain_current: data.domain_current || '',
        request_domain_purchase: data.request_domain_purchase || '',
        domain_preferences: data.domain_preferences || '',
        internal_notes: data.internal_notes || '',
        consent_accepted: data.consent_accepted,
        form_id: data.form_id || 'waas_onboarding_v1',
        source: data.source || 'stripe_onboarding_site',
        submitted_at: data.submitted_at || new Date().toISOString(),
      })
      .select()

    if (dbError) {
      console.error('Supabase error:', dbError)
      throw new Error('Failed to save to database')
    }

    console.log('✅ Saved to Supabase:', savedData?.[0]?.id)

    // Send to GoHighLevel webhook (primary method)
    const webhookUrl = process.env.GOHIGHLEVEL_WEBHOOK_URL || process.env.NEXT_PUBLIC_GHL_WEBHOOK_URL
    
    if (webhookUrl) {
      try {
        // Format payload for GHL webhook - send the entire payload as-is
        // GHL workflow will map fields as configured
        const webhookPayload = {
          // Core contact fields for GHL mapping
          firstName: firstName,
          lastName: lastName,
          email: data.contact_email,
          phone: data.contact_phone,
          companyName: data.business_name,
          city: data.business_city,
          state: data.business_state,
          source: data.source || 'stripe_onboarding_site',
          tags: ['onboarding_submitted', 'waas_build'],
          
          // Send all form data for workflow use
          ...data,
          
          // Add submission metadata
          submission_id: savedData?.[0]?.id,
        }

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        })

        if (!webhookResponse.ok) {
          console.error('GHL webhook error:', webhookResponse.status, await webhookResponse.text())
        } else {
          console.log('✅ Sent to GoHighLevel webhook')
        }
      } catch (ghlWebhookError) {
        console.error('GoHighLevel webhook error (non-fatal):', ghlWebhookError)
        // Don't fail the whole request if GHL webhook fails
      }
    } else {
      console.warn('⚠️ GHL webhook URL not configured')
    }

    // Optional: Also sync via GHL API if credentials are configured
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
            source: data.source || 'stripe_onboarding_site',
            tags: ['onboarding_submitted', 'waas_build'],
            customFields: [
              { key: 'business_type', value: data.business_type || '' },
              { key: 'years_in_service', value: data.years_in_service || '' },
              { key: 'services_primary', value: (data.services_primary || []).join(', ') },
              { key: 'market_type', value: data.market_type || '' },
              { key: 'service_areas', value: (data.service_areas || []).join(', ') },
              { key: 'preferred_contact', value: data.preferred_contact || '' },
              { key: 'has_domain', value: data.has_domain || '' },
            ],
          }),
        })

        if (ghlContactResponse.ok) {
          const ghlContact = await ghlContactResponse.json()
          ghlContactId = ghlContact.contact?.id || ghlContact.id
          console.log('✅ Created GoHighLevel contact:', ghlContactId)

          // Update Supabase with GoHighLevel ID
          await supabase
            .from('onboarding_submissions')
            .update({
              ghl_contact_id: ghlContactId,
              ghl_synced_at: new Date().toISOString(),
            })
            .eq('id', savedData?.[0]?.id)
        }
      } catch (ghlError) {
        console.error('GoHighLevel API sync error (non-fatal):', ghlError)
        // Don't fail the whole request if GHL sync fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding submitted successfully',
      id: savedData?.[0]?.id,
      ghl_synced: !!ghlContactId,
    })

  } catch (error: any) {
    console.error('Onboarding submission error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process onboarding' },
      { status: 500 }
    )
  }
}

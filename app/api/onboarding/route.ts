import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Validate required fields (new spec structure)
    if (!data.business_name || !data.first_name || !data.last_name || !data.contact_email) {
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
    const submissionTimestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })

    // Sync to GoHighLevel (if credentials are configured)
    if (process.env.GOHIGHLEVEL_API_KEY && process.env.GOHIGHLEVEL_LOCATION_ID) {
      try {
        // Format email content for GHL notes
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
Submitted: ${submissionTimestamp}
        `.trim()

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
          const ghlContactId = ghlContact.contact?.id || ghlContact.id
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
                monetaryValue: 0,
                status: 'open',
                source: 'Onboarding Form',
                notes: emailBody,
              }),
            })

            if (ghlOpportunityResponse.ok) {
              const ghlOpportunity = await ghlOpportunityResponse.json()
              const ghlOpportunityId = ghlOpportunity.opportunity?.id || ghlOpportunity.id
              console.log('✅ Created GoHighLevel opportunity:', ghlOpportunityId)
            }
          }
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

    // Create task in ClickUp for operators (if configured)
    if (process.env.CLICKUP_API_KEY && process.env.CLICKUP_LIST_ID) {
      try {
        console.log('🔵 Starting ClickUp integration...')
        console.log('🔵 Raw List ID from env:', process.env.CLICKUP_LIST_ID)
        console.log('🔵 API Key present:', !!process.env.CLICKUP_API_KEY)

        // Try different List ID formats
        const listIdsToTry = [
          process.env.CLICKUP_LIST_ID, // Original: 6-901707100098-1
          '901707100098', // Just the middle number
          '6', // Just the first part
          '9017408971' // Team ID from URL
        ]

        // Format task description with all onboarding data
        const clickupDescription = `
# 🎉 New Website Build Request

## 👤 Client Information
**Name:** ${fullName}
**Business:** ${data.business_name}
**Email:** ${data.contact_email}
**Phone:** ${data.contact_phone}
**Location:** ${data.business_city}, ${data.business_state}
**Years in Service:** ${data.years_in_service}
**Business Type:** ${data.business_type}

## 🛠️ Services Offered
**Primary Services:** ${(data.services_primary || []).join(', ')}
${data.services_secondary ? `**Other Services:** ${data.services_secondary}` : ''}

## 📍 Service Areas
**Market Type:** ${data.market_type}
**Areas Served:** ${(data.service_areas || []).join(', ')}

## 🎨 Branding & Media
${data.logo_url ? `**Logo:** ${data.logo_url}` : '**Logo:** Not provided'}
${data.gallery_urls && data.gallery_urls.length > 0 ? `**Gallery Images (${data.gallery_urls.length}):**\n${data.gallery_urls.map((url: string) => `- ${url}`).join('\n')}` : '**Gallery Images:** None provided'}
${data.brand_colors ? `**Brand Colors:** ${data.brand_colors}` : ''}
${data.design_constraints ? `**Design Constraints:** ${data.design_constraints}` : ''}

## 📝 About & Messaging
**About Text:**
${data.about_text}

${data.tagline ? `**Tagline:** ${data.tagline}` : ''}

## 📞 Site Contact Details
**Display Phone:** ${data.site_phone}
**Display Email:** ${data.site_email}
**Preferred Contact:** ${data.preferred_contact}

**Business Hours:**
${data.business_hours ? Object.entries(data.business_hours).map(([day, hours]: [string, any]) =>
  `- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}`
).join('\n') : 'Not provided'}

## 🌐 Social Media & Online Presence
${data.facebook_url ? `**Facebook:** ${data.facebook_url}` : ''}
${data.instagram_url ? `**Instagram:** ${data.instagram_url}` : ''}
${data.google_profile_url ? `**Google Business:** ${data.google_profile_url}` : ''}

## 🔗 Domain Information
**Has Domain:** ${data.has_domain}
${data.has_domain === 'Yes' ? `**Current Domain:** ${data.domain_current}` : ''}
${data.has_domain === 'No' && data.request_domain_purchase === 'Yes' ? `**Purchase Domain:** Yes\n**Domain Preferences:** ${data.domain_preferences || 'None specified'}` : ''}

${data.internal_notes ? `## 📌 Internal Notes\n${data.internal_notes}` : ''}

---
**Submitted:** ${submissionTimestamp}
**SMS Consent:** ${data.sms_consent ? 'Yes' : 'No'}
        `.trim()

        // Build payload - ClickUp API is picky about field names
        const clickupPayload: any = {
          name: `Website Build - ${data.business_name}`,
          description: clickupDescription,
          status: 'to do',
          priority: 3,
        }

        // Add tags only if they exist and are valid
        const tags = ['onboarding', 'website-build']
        if (data.business_type) {
          const businessTypeTag = data.business_type.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          if (businessTypeTag) tags.push(businessTypeTag)
        }
        if (tags.length > 0) {
          clickupPayload.tags = tags
        }

        // Try each List ID format
        let success = false
        for (const listId of listIdsToTry) {
          console.log(`🔍 Trying List ID: ${listId}`)

          try {
            const clickupResponse = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
              method: 'POST',
              headers: {
                'Authorization': process.env.CLICKUP_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(clickupPayload),
            })

            const responseText = await clickupResponse.text()
            console.log(`📡 List ID ${listId} - Response status:`, clickupResponse.status)

            if (clickupResponse.ok) {
              try {
                const clickupTask = JSON.parse(responseText)
                console.log('✅ Created ClickUp task:', clickupTask.id || clickupTask.task?.id)
                console.log('✅ ClickUp task URL:', clickupTask.url || clickupTask.task?.url)
                console.log(`🎉 SUCCESS with List ID: ${listId}`)
                success = true
                break // Stop trying other IDs
              } catch (parseError) {
                console.log('✅ ClickUp task created (response parsed):', responseText)
                success = true
                break
              }
            } else {
              console.log(`❌ List ID ${listId} failed:`, clickupResponse.status, responseText)
            }
          } catch (fetchError) {
            console.log(`❌ List ID ${listId} network error:`, fetchError.message)
          }
        }

        if (!success) {
          console.error('❌ All List ID formats failed. Please check your ClickUp List ID.')
          console.error('💡 Common issues:')
          console.error('   - List ID format might be different')
          console.error('   - API key might not have access to this list')
          console.error('   - List might not exist or be archived')
        }
      } catch (clickupError: any) {
        console.error('❌ ClickUp integration error (non-fatal):', clickupError)
        console.error('❌ Error message:', clickupError.message)
        console.error('❌ Error stack:', clickupError.stack)
        // Don't fail the whole request if ClickUp fails
      }
    } else {
      console.log('⚠️ ClickUp not configured - missing API_KEY or LIST_ID')
      console.log('⚠️ CLICKUP_API_KEY present:', !!process.env.CLICKUP_API_KEY)
      console.log('⚠️ CLICKUP_LIST_ID present:', !!process.env.CLICKUP_LIST_ID)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding submitted successfully',
    })

  } catch (error) {
    console.error('Onboarding submission error:', error)
    return NextResponse.json(
      { error: 'Failed to process onboarding' },
      { status: 500 }
    )
  }
}


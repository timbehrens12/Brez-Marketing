import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Validate required fields
    if (!data.business_name || !data.first_name || !data.last_name || !data.business_email) {
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
Friendly Name: ${data.friendly_business_name || 'N/A'}
Owner: ${fullName}
EIN: ${data.ein_number || 'N/A'}
Email: ${data.business_email}
Phone: ${data.business_phone}
Address: ${data.business_address || 'N/A'}
Time Zone: ${data.time_zone || 'N/A'}

Services Offered: ${data.services_offered || 'N/A'}
Years in Service: ${data.years_in_service || 'N/A'}
Business Type: ${data.business_type || 'N/A'}
Service Areas: ${(data.service_areas || []).join(', ') || 'N/A'}

Business Owner Phone: ${data.business_owner_phone || 'N/A'}
CRM Recipients: ${(data.crm_recipients || []).map((r: any) => `${r.label}: ${r.phone}`).join(', ') || 'None'}

Domain Option: ${data.domain_option || 'N/A'}
Desired Domain: ${data.desired_domain || 'N/A'}
${data.current_domain ? `Current Domain: ${data.current_domain}` : ''}

${data.logo_url ? `Logo: ${data.logo_url}` : ''}
${data.image_urls && data.image_urls.length > 0 ? `Images (${data.image_urls.length}): ${data.image_urls.join(', ')}` : ''}
${data.graphic_urls && data.graphic_urls.length > 0 ? `Graphics (${data.graphic_urls.length}): ${data.graphic_urls.join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted: ${submissionTimestamp}
    `.trim()

        // Debug logging for GHL contact creation
        console.log('🔍 GHL Contact Data:', {
          firstName,
          lastName,
          fullName,
          business_email: data.business_email,
          business_owner_phone: data.business_owner_phone,
          business_phone: data.business_phone,
          business_name: data.business_name,
          business_address: data.business_address,
          source: data.source
        })

        const ghlContactPayload = {
          locationId: process.env.GOHIGHLEVEL_LOCATION_ID,
          firstName: firstName,
          lastName: lastName,
          name: fullName, // GHL might prefer this
          email: data.business_email,
          phone: data.business_owner_phone || data.business_phone,
          companyName: data.business_name,
          address1: data.business_address,
          source: data.source || 'stripe_onboarding_site',
          tags: ['Onboarding', 'Website Build'],
          customFields: [
            { key: 'services_offered', value: data.services_offered || '' },
            { key: 'service_areas', value: (data.service_areas || []).join(', ') },
            { key: 'business_type', value: data.business_type || '' },
            { key: 'years_in_service', value: data.years_in_service || '' },
            { key: 'friendly_business_name', value: data.friendly_business_name || '' },
            { key: 'ein_number', value: data.ein_number || '' },
            { key: 'time_zone', value: data.time_zone || '' },
          ],
        }

        console.log('🔵 GHL Contact Payload:', JSON.stringify(ghlContactPayload, null, 2))

        const ghlContactResponse = await fetch(`https://rest.gohighLevel.com/v1/contacts/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GOHIGHLEVEL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ghlContactPayload),
        })

        console.log('🔵 GHL Contact Response Status:', ghlContactResponse.status)

        if (!ghlContactResponse.ok) {
          const errorText = await ghlContactResponse.text()
          console.error('❌ GHL Contact Creation Failed:', ghlContactResponse.status, errorText)
          throw new Error(`GHL Contact creation failed: ${ghlContactResponse.status}`)
        }

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
            email: data.business_email,
            phone: data.business_owner_phone || data.business_phone,
            companyName: data.business_name,
            address: data.business_address,
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
NEW WEBSITE BUILD REQUEST

CLIENT INFORMATION:
Name: ${fullName}
Business: ${data.business_name}
${data.friendly_business_name ? `Friendly Name: ${data.friendly_business_name}` : ''}
${data.ein_number ? `EIN: ${data.ein_number}` : ''}
Email: ${data.business_email}
Phone: ${data.business_phone}
${data.business_address ? `Address: ${data.business_address}` : ''}
${data.time_zone ? `Time Zone: ${data.time_zone}` : ''}
${data.years_in_service ? `Years in Service: ${data.years_in_service}` : ''}
${data.business_type ? `Business Type: ${data.business_type}` : ''}

SERVICES OFFERED:
${data.services_offered || 'Not specified'}

SERVICE AREAS:
${(data.service_areas || []).join(', ') || 'Not specified'}

CRM CONTACT RECIPIENTS:
Business Owner: ${data.business_owner_phone || 'Not specified'}
${(data.crm_recipients || []).length > 0 ? `Additional Recipients:\n${data.crm_recipients.map((r: any) => `- ${r.label}: ${r.phone}`).join('\n')}` : ''}

DOMAIN CONFIGURATION:
Domain Option: ${data.domain_option || 'Not specified'}
Desired Domain: ${data.desired_domain || 'Not specified'}
${data.current_domain ? `Current Domain: ${data.current_domain}` : ''}

DIGITAL ASSETS:
${data.logo_url ? `Logo: ${data.logo_url}` : 'Logo: Not provided'}
${data.image_urls && data.image_urls.length > 0 ? `Images (${data.image_urls.length}):\n${data.image_urls.map((url: string) => `- ${url}`).join('\n')}` : 'Images: None provided'}
${data.graphic_urls && data.graphic_urls.length > 0 ? `Graphics (${data.graphic_urls.length}):\n${data.graphic_urls.map((url: string) => `- ${url}`).join('\n')}` : 'Graphics: None provided'}

Submitted: ${submissionTimestamp}
Consent Accepted: ${data.consent_accepted ? 'Yes' : 'No'}
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


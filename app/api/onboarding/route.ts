import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Validate required fields
    if (!data.businessName || !data.contactName || !data.businessEmail || !data.businessPhone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!data.leadAlertMethod) {
      return NextResponse.json(
        { error: 'Lead alert method is required' },
        { status: 400 }
      )
    }

    // Format email content
    const emailBody = `
🎉 NEW CLIENT ONBOARDING RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.operator_code ? `👤 OPERATOR: ${data.operator_code.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}
📋 BUSINESS INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Name: ${data.businessName}
Contact: ${data.contactName}
Email: ${data.businessEmail}
Phone: ${data.businessPhone}

Address:
${data.businessAddress.street || '—'}
${data.businessAddress.city || '—'}, ${data.businessAddress.state || '—'} ${data.businessAddress.zip || '—'}
${data.businessAddress.country || '—'}

Niche/Industry: ${data.businessNiche || '—'}
Description: ${data.businessDescription || '—'}
Services Offered:
${data.servicesOffered || '—'}

Operating Hours:
${data.operatingHours ? Object.entries(data.operatingHours).map(([day, hours]: [string, any]) => 
  `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}`
).join('\n') : '—'}
Service Areas: ${data.serviceAreas || '—'}

🎨 BRANDING & DESIGN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Logo: ${data.logoFile ? '✓ Uploaded' : '—'}
Photos: ${data.photoFiles?.length || 0} files
Certificates: ${data.certFiles?.length || 0} files
Color Scheme: ${data.colorScheme}
Slogan: ${data.slogan || '—'}
Brand Guidelines: ${data.brandGuidelines ? '✓ Uploaded' : '—'}

About Us Section: ${data.hasAboutUs ? '✓ Yes' : '✗ No'}
${data.hasAboutUs ? `\n${data.aboutUsText}\n` : ''}

Meet the Team: ${data.hasMeetTheTeam ? '✓ Yes' : '✗ No'}
${data.hasMeetTheTeam && data.teamMembers ? data.teamMembers.map((member: any) => 
  `  • ${member.name || '(unnamed)'} - ${member.role || '(no role)'} ${member.photo ? '✓ Photo' : '✗ No photo'}`
).join('\n') : ''}

Inspiration Sites:
${data.inspirationSites?.filter((s: string) => s).join('\n') || '—'}

🌐 ONLINE PRESENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Existing Website: ${data.hasExistingWebsite ? '✓ Yes' : '✗ No'}
${data.hasExistingWebsite ? `Current Domain: ${data.currentDomain}` : ''}
${!data.hasExistingWebsite && data.needDomainHelp ? `Needs domain help: ✓\nDesired domain: ${data.desiredDomain}` : ''}

Google Business Profile: ${data.hasGoogleBusiness ? '✓ Yes' : '✗ No'}
${data.hasGoogleBusiness ? `Gmail: ${data.googleBusinessEmail}` : ''}
${!data.hasGoogleBusiness && data.needGoogleSetup ? 'Needs Google setup: ✓' : ''}

Social Links:
Facebook: ${data.socialLinks?.facebook || '—'}
Instagram: ${data.socialLinks?.instagram || '—'}
TikTok: ${data.socialLinks?.tiktok || '—'}
LinkedIn: ${data.socialLinks?.linkedin || '—'}
Yelp: ${data.socialLinks?.yelp || '—'}
Other: ${data.socialLinks?.other || '—'}

📞 LEADS & COMMUNICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lead Alert Method: ${data.leadAlertMethod}
${data.leadAlertMethod !== 'email' ? `Alert Phone: ${data.alertPhone}` : ''}
${data.leadAlertMethod !== 'text' ? `Alert Email: ${data.alertEmail}` : ''}

Lead Form Fields:
${data.leadFormFields?.join(', ') || '—'}

Extra Lead Form Requests:
${data.extraLeadFormRequests || '—'}

Bookings/Payments: ${data.bookingsPayments}
${data.bookingsPayments !== 'none' ? `Notes: ${data.bookingsPaymentsNotes}` : ''}

Portfolio Section: ${data.hasPortfolio ? '✓ Yes' : '✗ No'}
${data.hasPortfolio ? `Portfolio Files: ${data.portfolioFiles?.length || 0} files` : ''}

Reviews Section: ${data.hasReviews ? '✓ Yes' : '✗ No'}

📝 FINAL DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Owns Domain: ${data.ownsDomain ? '✓ Yes' : '✗ No'}
${data.ownsDomain ? `Domain: ${data.ownedDomain}\nDNS Manager: ${data.dnsManager}` : ''}

Compliance Needs: ${data.complianceNeeds || '—'}

Special Notes:
${data.specialNotes || '—'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}
    `.trim()

    // Save to Supabase
    const { data: savedData, error: dbError } = await supabase
      .from('onboarding_submissions')
      .insert({
        business_name: data.businessName,
        contact_name: data.contactName,
        business_email: data.businessEmail,
        business_phone: data.businessPhone,
        business_address: data.businessAddress || {},
        business_niche: data.businessNiche,
        business_description: data.businessDescription,
        services_offered: data.servicesOffered,
        operating_hours: data.operatingHours,
        service_areas: data.serviceAreas,
        
        logo_file: data.logoFile,
        photo_files: data.photoFiles || [],
        cert_files: data.certFiles || [],
        color_scheme: data.colorScheme,
        slogan: data.slogan,
        brand_guidelines: data.brandGuidelines,
        has_about_us: data.hasAboutUs || false,
        about_us_text: data.aboutUsText,
        has_meet_the_team: data.hasMeetTheTeam || false,
        team_members: data.teamMembers || [],
        inspiration_sites: data.inspirationSites || [],
        
        has_existing_website: data.hasExistingWebsite || false,
        current_domain: data.currentDomain,
        need_domain_help: data.needDomainHelp || false,
        desired_domain: data.desiredDomain,
        has_google_business: data.hasGoogleBusiness || false,
        google_business_email: data.googleBusinessEmail,
        need_google_setup: data.needGoogleSetup || false,
        social_links: data.socialLinks || {},
        
        lead_alert_method: data.leadAlertMethod,
        alert_phone: data.alertPhone,
        alert_email: data.alertEmail,
        lead_form_fields: data.leadFormFields || [],
        extra_lead_form_requests: data.extraLeadFormRequests,
        bookings_payments: data.bookingsPayments,
        bookings_payments_notes: data.bookingsPaymentsNotes,
        has_portfolio: data.hasPortfolio || false,
        portfolio_files: data.portfolioFiles || [],
        has_reviews: data.hasReviews || false,
        
        owns_domain: data.ownsDomain || false,
        owned_domain: data.ownedDomain,
        dns_manager: data.dnsManager,
        compliance_needs: data.complianceNeeds,
        special_notes: data.specialNotes,
        operator_code: data.operator_code || null,
      })
      .select()

    if (dbError) {
      console.error('Supabase error:', dbError)
      throw new Error('Failed to save to database')
    }

    console.log('✅ Saved to Supabase:', savedData.id)

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
            firstName: data.contactName.split(' ')[0],
            lastName: data.contactName.split(' ').slice(1).join(' ') || '',
            email: data.businessEmail,
            phone: data.businessPhone,
            companyName: data.businessName,
            address1: data.businessAddress?.street || '',
            city: data.businessAddress?.city || '',
            state: data.businessAddress?.state || '',
            postalCode: data.businessAddress?.zip || '',
            country: data.businessAddress?.country || '',
            website: data.hasExistingWebsite ? data.currentDomain : '',
            source: 'Onboarding Form - tlucasystems.com',
            tags: ['Onboarding', 'Website Build', data.hasExistingWebsite ? 'Existing Website' : 'New Website'],
            customFields: [
              { key: 'services_offered', value: data.servicesOffered || '' },
              { key: 'operating_hours', value: data.operatingHours || '' },
              { key: 'service_areas', value: data.serviceAreas || '' },
              { key: 'lead_alert_method', value: data.leadAlertMethod },
              { key: 'color_scheme', value: data.colorScheme || '' },
              { key: 'special_notes', value: data.specialNotes || '' },
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
                name: `Website Build - ${data.businessName}`,
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
            .eq('id', savedData.id)
        }
      } catch (ghlError) {
        console.error('GoHighLevel sync error (non-fatal):', ghlError)
        // Don't fail the whole request if GHL sync fails
      }
    }

    // Send to Zapier webhook (if configured)
    if (process.env.ZAPIER_WEBHOOK_URL) {
      try {
        await fetch(process.env.ZAPIER_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Core Info
            submission_id: savedData.id,
            business_name: data.businessName,
            contact_name: data.contactName,
            business_email: data.businessEmail,
            business_phone: data.businessPhone,
            
            // Business Details
            business_address: data.businessAddress,
            business_niche: data.businessNiche,
            business_description: data.businessDescription,
            services_offered: data.servicesOffered,
            operating_hours: data.operatingHours,
            service_areas: data.serviceAreas,
            
            // Branding - Images (keep URLs clean for Slack to render)
            logo_url: data.logo_url || null,
            photo_url_1: data.photo_urls?.[0] || null,
            photo_url_2: data.photo_urls?.[1] || null,
            photo_url_3: data.photo_urls?.[2] || null,
            photo_url_4: data.photo_urls?.[3] || null,
            photo_url_5: data.photo_urls?.[4] || null,
            certificate_url_1: data.certificate_urls?.[0] || null,
            certificate_url_2: data.certificate_urls?.[1] || null,
            certificate_url_3: data.certificate_urls?.[2] || null,
            team_member_1_name: data.teamMembers?.[0]?.name || null,
            team_member_1_role: data.teamMembers?.[0]?.role || null,
            team_member_1_photo: data.team_member_photos?.[0] || null,
            team_member_2_name: data.teamMembers?.[1]?.name || null,
            team_member_2_role: data.teamMembers?.[1]?.role || null,
            team_member_2_photo: data.team_member_photos?.[1] || null,
            team_member_3_name: data.teamMembers?.[2]?.name || null,
            team_member_3_role: data.teamMembers?.[2]?.role || null,
            team_member_3_photo: data.team_member_photos?.[2] || null,
            team_member_4_name: data.teamMembers?.[3]?.name || null,
            team_member_4_role: data.teamMembers?.[3]?.role || null,
            team_member_4_photo: data.team_member_photos?.[3] || null,
            team_member_5_name: data.teamMembers?.[4]?.name || null,
            team_member_5_role: data.teamMembers?.[4]?.role || null,
            team_member_5_photo: data.team_member_photos?.[4] || null,
            team_member_6_name: data.teamMembers?.[5]?.name || null,
            team_member_6_role: data.teamMembers?.[5]?.role || null,
            team_member_6_photo: data.team_member_photos?.[5] || null,
            team_member_7_name: data.teamMembers?.[6]?.name || null,
            team_member_7_role: data.teamMembers?.[6]?.role || null,
            team_member_7_photo: data.team_member_photos?.[6] || null,
            team_member_8_name: data.teamMembers?.[7]?.name || null,
            team_member_8_role: data.teamMembers?.[7]?.role || null,
            team_member_8_photo: data.team_member_photos?.[7] || null,
            team_member_9_name: data.teamMembers?.[8]?.name || null,
            team_member_9_role: data.teamMembers?.[8]?.role || null,
            team_member_9_photo: data.team_member_photos?.[8] || null,
            team_member_10_name: data.teamMembers?.[9]?.name || null,
            team_member_10_role: data.teamMembers?.[9]?.role || null,
            team_member_10_photo: data.team_member_photos?.[9] || null,
            portfolio_count: data.portfolioFiles?.length || 0,
            color_scheme: data.colorScheme,
            slogan: data.slogan || null,
            has_about_us: data.hasAboutUs,
            about_us_text: data.hasAboutUs ? data.aboutUsText : null,
            has_meet_the_team: data.hasMeetTheTeam,
            inspiration_sites: data.inspirationSites,
            
            // Online Presence
            has_existing_website: data.hasExistingWebsite,
            current_domain: data.currentDomain,
            need_domain_help: data.needDomainHelp,
            desired_domain: data.desiredDomain,
            has_google_business: data.hasGoogleBusiness,
            google_business_email: data.googleBusinessEmail,
            social_links: data.socialLinks,
            
            // Leads & Communication
            lead_alert_method: data.leadAlertMethod,
            alert_phone: data.alertPhone,
            alert_email: data.alertEmail,
            lead_form_fields: data.leadFormFields,
            bookings_payments: data.bookingsPayments,
            has_portfolio: data.hasPortfolio,
            has_reviews: data.hasReviews,
            
            // Final Details
            owns_domain: data.ownsDomain,
            owned_domain: data.ownedDomain,
            dns_manager: data.dnsManager,
            compliance_needs: data.complianceNeeds,
            special_notes: data.specialNotes,
            
            // Metadata
            submitted_at: new Date().toISOString(),
            formatted_summary: emailBody, // Pre-formatted for easy reading
            operator_code: data.operator_code || null, // Track which operator's link was used
          }),
        })
        console.log('✅ Sent to Zapier webhook')
      } catch (zapierError) {
        console.error('Zapier webhook error (non-fatal):', zapierError)
        // Don't fail the whole request if Zapier fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding submitted successfully',
      id: savedData.id,
      ghl_synced: !!ghlContactId,
    })

  } catch (error) {
    console.error('Onboarding submission error:', error)
    return NextResponse.json(
      { error: 'Failed to process onboarding' },
      { status: 500 }
    )
  }
}


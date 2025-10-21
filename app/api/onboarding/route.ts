import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

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

Description: ${data.businessDescription || '—'}
Services Offered:
${data.servicesOffered || '—'}

Operating Hours: ${data.operatingHours || '—'}
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
${data.hasMeetTheTeam ? `\n${data.teamText}\n` : ''}
Team Photos: ${data.teamPhotos?.length || 0} files

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

    // Send email notification (using your existing email setup)
    // This is a placeholder - integrate with your actual email service
    console.log('Onboarding received for:', data.businessName)
    console.log(emailBody)

    // TODO: Store in database if needed
    // TODO: Send actual email to builds@tlucasystems.com
    // TODO: Create CRM contact/task if CRM integration exists

    return NextResponse.json({ 
      success: true,
      message: 'Onboarding submitted successfully'
    })

  } catch (error) {
    console.error('Onboarding submission error:', error)
    return NextResponse.json(
      { error: 'Failed to process onboarding' },
      { status: 500 }
    )
  }
}


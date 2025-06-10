import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import { auth } from '@clerk/nextjs/server'

const supabase = getSupabaseClient()

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadIds } = await req.json()
    
    if (!leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json({ error: 'Lead IDs array is required' }, { status: 400 })
    }

    // Get leads that have websites but no emails
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, business_name, website, email')
      .in('id', leadIds)
      .eq('user_id', userId)
      .not('website', 'is', null)
      .neq('website', '')

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    const results = []
    
    for (const lead of leads) {
      try {
        // Skip if already has email
        if (lead.email && lead.email !== 'N/A') {
          results.push({
            leadId: lead.id,
            success: false,
            message: 'Email already exists',
            email: lead.email
          })
          continue
        }

        // Scrape email from website
        const scrapedEmail = await scrapeEmailFromWebsite(lead.website as string)
        
        if (scrapedEmail) {
          // Update the lead with found email
          const { error: updateError } = await supabase
            .from('leads')
            .update({ 
              email: scrapedEmail,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', lead.id)
            .eq('user_id', userId)

          if (updateError) {
            console.error('Error updating lead email:', updateError)
            results.push({
              leadId: lead.id,
              success: false,
              message: 'Failed to update email',
              email: scrapedEmail
            })
          } else {
            results.push({
              leadId: lead.id,
              success: true,
              message: 'Email found and updated',
              email: scrapedEmail
            })
          }
        } else {
          results.push({
            leadId: lead.id,
            success: false,
            message: 'No email found on website',
            email: null
          })
        }

        // Add delay to avoid being rate-limited
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Error processing lead ${lead.id}:`, error)
        results.push({
          leadId: lead.id,
          success: false,
          message: 'Error processing website',
          email: null
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    
    return NextResponse.json({
      success: true,
      message: `Found emails for ${successCount} out of ${leads.length} leads`,
      results
    })

  } catch (error) {
    console.error('Email enrichment error:', error)
    return NextResponse.json(
      { error: 'Failed to enrich emails' },
      { status: 500 }
    )
  }
}

async function scrapeEmailFromWebsite(website: string): Promise<string | null> {
  try {
    // Clean and validate URL
    let url = website.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Try multiple pages that commonly contain contact info
    const pages = [
      '',           // Homepage
      '/contact',   // Contact page
      '/about',     // About page
      '/contact-us',
      '/about-us',
      '/team',
      '/staff'
    ]

    for (const page of pages) {
      try {
        const fullUrl = url + page
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(fullUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) continue

        const html = await response.text()
        const emails = extractEmailsFromHtml(html, website)
        
        if (emails.length > 0) {
          // Return the most likely business email
          return selectBestEmail(emails)
        }

      } catch (pageError: any) {
        console.log(`Failed to scrape ${url + page}:`, pageError?.message || 'Unknown error')
        continue
      }
    }

    return null

  } catch (error) {
    console.error('Website scraping error:', error)
    return null
  }
}

function extractEmailsFromHtml(html: string, website: string): string[] {
  const emails = new Set<string>()
  
  // Multiple email regex patterns
  const emailPatterns = [
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)/gi,
    /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /(?:email|e-mail|contact)(?:\s*[:\-]\s*|:\s*)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  ]

  for (const pattern of emailPatterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const email = (match[1] || match[0]).toLowerCase().trim()
      
      // Basic validation
      if (isValidEmail(email) && !isGenericEmail(email)) {
        emails.add(email)
      }
    }
  }

  return Array.from(emails)
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length < 100
}

function isGenericEmail(email: string): boolean {
  const genericEmails = [
    'info@example.com',
    'contact@example.com',
    'admin@example.com',
    'support@example.com',
    'no-reply@',
    'noreply@',
    'donotreply@',
    'webmaster@',
    'postmaster@',
    'example@',
    'test@',
    'demo@'
  ]
  
  return genericEmails.some(generic => email.includes(generic))
}

function selectBestEmail(emails: string[]): string {
  // Priority order for email selection
  const priorities = [
    'info@',
    'contact@',
    'hello@',
    'sales@',
    'business@',
    'owner@',
    'admin@'
  ]

  // First, try to find an email with a priority prefix
  for (const priority of priorities) {
    const match = emails.find(email => email.startsWith(priority))
    if (match) return match
  }

  // If no priority email found, return the first valid one
  return emails[0]
} 
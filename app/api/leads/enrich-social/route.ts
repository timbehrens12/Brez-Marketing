import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { businessName, city, state, website } = await request.json()

    if (!businessName) {
      return NextResponse.json({ error: 'Business name required' }, { status: 400 })
    }

    const socialProfiles = await findSocialMediaProfiles(businessName, city, state, website)
    
    return NextResponse.json({
      success: true,
      profiles: socialProfiles
    })

  } catch (error) {
    console.error('Social media enrichment error:', error)
    return NextResponse.json(
      { error: 'Failed to find social media profiles' },
      { status: 500 }
    )
  }
}

async function findSocialMediaProfiles(businessName: string, city?: string, state?: string, website?: string) {
  const profiles = {
    instagram_handle: 'N/A',
    facebook_page: 'N/A',
    linkedin_profile: 'N/A',
    twitter_handle: 'N/A'
  }

  try {
    // Method 1: Search using SerpAPI (Google search results)
    if (process.env.SERPAPI_KEY) {
      const searchResults = await searchWithSerpAPI(businessName, city, state)
      Object.assign(profiles, extractSocialFromSearch(searchResults))
    }

    // Method 2: Check website for social links (if website exists)
    if (website && website !== 'N/A') {
      const websiteProfiles = await extractSocialFromWebsite(website)
      Object.assign(profiles, websiteProfiles)
    }

    // Method 3: Intelligent pattern matching
    const patternProfiles = generateSocialPatterns(businessName)
    
    // Only use pattern matches if we didn't find real ones
    Object.keys(profiles).forEach(key => {
      if (profiles[key as keyof typeof profiles] === 'N/A' && patternProfiles[key as keyof typeof patternProfiles] !== 'N/A') {
        profiles[key as keyof typeof profiles] = `${patternProfiles[key as keyof typeof patternProfiles]} (estimated)`
      }
    })

    return profiles
    
  } catch (error) {
    console.error('Error finding social profiles:', error)
    return profiles
  }
}

async function searchWithSerpAPI(businessName: string, city?: string, state?: string) {
  const location = city && state ? ` ${city} ${state}` : ''
  const queries = [
    `"${businessName}"${location} instagram`,
    `"${businessName}"${location} instagram`,
    `"${businessName}"${location} facebook`,
    `"${businessName}"${location} linkedin`,
    `"${businessName}"${location} twitter`,
    `"${businessName}"${location} social media`
  ]

  const results: any[] = []

  for (const query of queries) {
    try {
      const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=5`)
      const data = await response.json()
      
      if (data.organic_results) {
        results.push(...data.organic_results)
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error('SerpAPI search error:', error)
    }
  }

  return results
}

function extractSocialFromSearch(searchResults: any[]) {
  const profiles = {
    instagram_handle: 'N/A',
    facebook_page: 'N/A',
    linkedin_profile: 'N/A',
    twitter_handle: 'N/A'
  }

  for (const result of searchResults) {
    const url = result.link || ''
    const title = result.title || ''

    // Instagram
    if (url.includes('instagram.com/') && !url.includes('/p/') && !url.includes('/reel/')) {
      const match = url.match(/instagram\.com\/([^/\?]+)/)
      if (match && match[1]) {
        profiles.instagram_handle = `@${match[1]}`
      }
    }

    // Facebook
    if (url.includes('facebook.com/') && !url.includes('/posts/') && !url.includes('/photos/') && !url.includes('/groups/')) {
      const match = url.match(/facebook\.com\/([^/\?#]+)/)
      if (match && match[1] && match[1] !== 'pages' && !match[1].includes('profile.php')) {
        // Filter out generic Facebook placeholders and invalid handles
        const invalidHandles = [
          'Facebook-f', 'facebook-f', 'Facebook', 'facebook', 
          'pages', 'home', 'login', 'sharer', 'dialog', 'tr', 'plugins', 'help'
        ];
        
        if (!invalidHandles.includes(match[1]) && 
            !match[1].toLowerCase().includes('facebook-f') && 
            match[1].length >= 3) {
        profiles.facebook_page = match[1]
        }
      }
    }

    // LinkedIn
    if (url.includes('linkedin.com/company/')) {
      const match = url.match(/linkedin\.com\/company\/([^/\?]+)/)
      if (match && match[1]) {
        profiles.linkedin_profile = `company/${match[1]}`
      }
    }

    // Twitter/X
    if (url.includes('twitter.com/') || url.includes('x.com/')) {
      const match = url.match(/(?:twitter|x)\.com\/([^/\?#]+)/)
      if (match && match[1] && !match[1].includes('status') && !match[1].includes('intent') && match[1] !== 'home') {
        profiles.twitter_handle = `@${match[1]}`
      }
    }
  }

  return profiles
}

async function extractSocialFromWebsite(website: string) {
  const profiles = {
    instagram_handle: 'N/A',
    facebook_page: 'N/A',
    linkedin_profile: 'N/A',
    twitter_handle: 'N/A'
  }

  try {
    // Fetch the website homepage with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(website, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) return profiles

    const html = await response.text()

    // Look for social media links in the HTML
    const socialPatterns = {
      instagram: /(?:href=["']|@)(https?:\/\/(?:www\.)?instagram\.com\/([^\/\s"'?#]+))/gi,
      facebook: /(?:href=["']|@)(https?:\/\/(?:www\.)?facebook\.com\/([^\/\s"'?#]+))/gi,
      linkedin: /(?:href=["']|@)(https?:\/\/(?:www\.)?linkedin\.com\/(?:company\/)?([^\/\s"'?#]+))/gi,
      twitter: /(?:href=["']|@)(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([^\/\s"'?#]+))/gi
    }

    // Extract Instagram
    let match = socialPatterns.instagram.exec(html)
    if (match && match[2]) {
      profiles.instagram_handle = `@${match[2]}`
    }

    // Extract Facebook
    match = socialPatterns.facebook.exec(html)
    if (match && match[2] && match[2] !== 'pages' && !match[2].includes('profile.php')) {
      // Filter out generic Facebook placeholders
      const invalidHandles = [
        'Facebook-f', 'facebook-f', 'Facebook', 'facebook', 
        'pages', 'home', 'login', 'sharer', 'dialog', 'tr', 'plugins', 'help'
      ];
      
      if (!invalidHandles.includes(match[2]) && 
          !match[2].toLowerCase().includes('facebook-f') && 
          match[2].length >= 3) {
      profiles.facebook_page = match[2]
      }
    }

    // Extract LinkedIn
    match = socialPatterns.linkedin.exec(html)
    if (match && match[2]) {
      // If the URL already contains 'company/', use as is, otherwise add it
      profiles.linkedin_profile = match[2].startsWith('company/') ? match[2] : `company/${match[2]}`
    }

    // Extract Twitter
    match = socialPatterns.twitter.exec(html)
    if (match && match[2] && !match[2].includes('status') && !match[2].includes('intent') && match[2] !== 'home') {
      profiles.twitter_handle = `@${match[2]}`
    }

    return profiles

  } catch (error) {
    console.error('Website scraping error:', error)
    return profiles
  }
}

function generateSocialPatterns(businessName: string) {
  // Generate likely social media handles based on business name
  const cleanName = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .replace(/inc|llc|corp|company|co|ltd|services|service/g, '')
    .trim()

  // Common variations
  const variations = [
    cleanName,
    cleanName.replace(/\s/g, ''),
    cleanName.replace(/\s/g, '_'),
    cleanName.replace(/\s/g, '.'),
    `${cleanName}official`,
    `${cleanName}biz`
  ]

  // Return the most likely handles (marked as estimated)
  return {
    instagram_handle: variations[0] ? `@${variations[0]}` : 'N/A',
    facebook_page: variations[0] || 'N/A',
    linkedin_profile: variations[0] ? `company/${variations[0]}` : 'N/A',
    twitter_handle: variations[0] ? `@${variations[0]}` : 'N/A'
  }
} 
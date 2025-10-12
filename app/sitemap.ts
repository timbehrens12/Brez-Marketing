import { MetadataRoute } from 'next'

/**
 * Dynamic sitemap for Brez Marketing Dashboard
 * Only includes public-facing pages that should be indexed by search engines
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://brezmarketingdashboard.com'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/data-security`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}


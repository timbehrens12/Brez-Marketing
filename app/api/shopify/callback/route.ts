import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  console.log('Shopify callback route hit - redirecting to callback page')
  
  // Get all the query parameters
  const url = new URL(request.url)
  const queryParams = url.search // This includes the ? at the beginning
  
  // Redirect to our callback page with all the same parameters
  const callbackPageUrl = `${url.protocol}//${url.host}/shopify-callback${queryParams}`
  
  console.log('Redirecting to:', callbackPageUrl)
  return NextResponse.redirect(callbackPageUrl)
} 
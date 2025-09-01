import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect('/review?error=failed')
  }

  // For review, just redirect back to review page with success
  return NextResponse.redirect('/review?success=true')
} 
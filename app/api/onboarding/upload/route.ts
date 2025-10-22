import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Create FormData for Cloudinary
    const cloudinaryData = new FormData()
    cloudinaryData.append('file', file)
    cloudinaryData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'onboarding')
    cloudinaryData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '')

    // Upload to Cloudinary
    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
      {
        method: 'POST',
        body: cloudinaryData,
      }
    )

    if (!cloudinaryResponse.ok) {
      console.error('Cloudinary upload failed:', await cloudinaryResponse.text())
      return NextResponse.json(
        { error: 'Failed to upload file to Cloudinary' },
        { status: 500 }
      )
    }

    const result = await cloudinaryResponse.json()

    return NextResponse.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
      url: result.url,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}

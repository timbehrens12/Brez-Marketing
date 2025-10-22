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

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName) {
      console.error('Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME')
      return NextResponse.json(
        { error: 'Cloudinary cloud name not configured' },
        { status: 500 }
      )
    }

    if (!uploadPreset) {
      console.error('Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET')
      return NextResponse.json(
        { error: 'Cloudinary upload preset not configured' },
        { status: 500 }
      )
    }

    // Create FormData for Cloudinary unsigned upload
    const cloudinaryData = new FormData()
    cloudinaryData.append('file', file)
    cloudinaryData.append('upload_preset', uploadPreset)

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
    
    console.log('Uploading to Cloudinary:', { cloudName, uploadPreset, url: cloudinaryUrl })

    const cloudinaryResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: cloudinaryData,
    })

    const responseText = await cloudinaryResponse.text()
    
    if (!cloudinaryResponse.ok) {
      console.error('Cloudinary upload failed:', responseText)
      return NextResponse.json(
        { error: `Cloudinary error: ${responseText}` },
        { status: 500 }
      )
    }

    const result = JSON.parse(responseText)

    return NextResponse.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
      url: result.url,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

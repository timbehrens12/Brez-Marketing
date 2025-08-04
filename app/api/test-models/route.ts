import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  try {
    console.log('Fetching available models...')
    
    const models = await openai.models.list()
    
    // Filter for image-related models
    const imageModels = models.data.filter(model => 
      model.id.includes('dall-e') || 
      model.id.includes('image') || 
      model.id.includes('gpt-image')
    )
    
    console.log('All models:', models.data.map(m => m.id))
    console.log('Image models found:', imageModels.map(m => m.id))
    
    return NextResponse.json({
      allModels: models.data.map(m => ({ id: m.id, created: m.created })),
      imageModels: imageModels.map(m => ({ id: m.id, created: m.created })),
      hasGptImage1: models.data.some(m => m.id === 'gpt-image-1')
    })
    
  } catch (error: any) {
    console.error('Error fetching models:', error)
    
    return NextResponse.json({
      error: 'Failed to fetch models',
      details: error?.message
    }, { status: 500 })
  }
}
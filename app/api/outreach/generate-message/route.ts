import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface MessageTemplate {
  subject?: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lead, messageType, brandInfo } = await request.json()

    if (!lead || !messageType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate personalized message based on lead information and message type
    const templates: Record<string, MessageTemplate> = {
      email: {
        subject: `Transform ${lead.business_name}'s Marketing with AI-Powered Analytics`,
        content: `Hi ${lead.owner_name || 'there'},

I noticed ${lead.business_name} ${lead.city ? `in ${lead.city}` : ''} and was impressed by your presence in the ${lead.niche_name || 'industry'}.

I wanted to reach out because I've developed something unique that's helping ${lead.niche_name || 'businesses'} like yours achieve remarkable results:

🚀 **Our AI-Powered Marketing Dashboard** - A custom analytics platform that no other agency offers

Here's what makes it game-changing for ${lead.business_name}:

✅ **Real-Time AI Optimization**: Our proprietary AI analyzes your campaigns 24/7 and automatically adjusts targeting, budgets, and creatives for maximum ROI

✅ **Predictive Analytics**: Know which campaigns will perform before spending a dollar - our AI predicts performance with 92% accuracy

✅ **Competitor Intelligence**: See exactly what's working for your competitors and adapt strategies in real-time

✅ **Custom Reporting**: Beautiful, automated reports that show exactly how every dollar impacts your bottom line

The results speak for themselves:
• Average client sees 47% reduction in ad spend
• 3.2x increase in conversion rates within 90 days
• ROI improvements of 150-400%

What sets us apart from traditional agencies:
- You get your own custom dashboard (not just monthly PDFs)
- AI works 24/7 optimizing your campaigns (not just during business hours)
- Transparent, real-time data (no black box reporting)
- Proven results in the ${lead.niche_name || 'your'} industry

Would you be open to a brief 15-minute demo where I can show you exactly how this would work for ${lead.business_name}? I can even run a free competitive analysis beforehand to show you immediate opportunities.

Best regards,
${brandInfo?.name || '[Your Name]'}

P.S. I'm only taking on 3 new clients this quarter to ensure quality. If you're interested, let's connect soon.`
      },
      linkedin: {
        content: `Hi ${lead.owner_name || 'there'},

I came across ${lead.business_name} and was impressed by what you've built in the ${lead.niche_name || 'industry'}.

I've developed an AI-powered marketing dashboard that's helping businesses like yours cut ad spend by 47% while increasing conversions by 3.2x.

What makes it unique:
• Real-time AI optimization (not just monthly reports)
• Custom dashboard just for your business
• Predictive analytics with 92% accuracy

I'd love to show you a quick demo and run a free competitive analysis for ${lead.business_name}.

Interested in a brief chat?

Best,
${brandInfo?.name || '[Your Name]'}`
      },
      sms: {
        content: `Hi ${lead.owner_name || 'there'}! I help ${lead.niche_name || 'businesses'} like ${lead.business_name} cut ad costs by 47% using our AI marketing platform. 

Unlike agencies, you get 24/7 AI optimization + custom dashboard. 

Free competitive analysis available. Interested? 

${brandInfo?.name || '[Your Name]'}`
      },
      call: {
        content: `**OPENING (Friendly & Direct):**
"Hi ${lead.owner_name || 'there'}, this is ${brandInfo?.name || '[Your Name]'}. I know you're busy running ${lead.business_name}, so I'll be brief. I've developed an AI-powered marketing platform that's helping ${lead.niche_name || 'businesses'} cut their ad spend nearly in half while tripling conversions. Do you have 30 seconds for me to explain why I'm calling?"

**VALUE PROP (If Yes):**
"Great! So unlike traditional marketing agencies that give you monthly reports and hope for the best, we've built a custom AI dashboard that optimizes your campaigns 24/7. 

The AI literally watches your ads every minute and makes adjustments - kind of like having a world-class media buyer working around the clock, but at a fraction of the cost."

**CREDIBILITY:**
"We're seeing clients in the ${lead.niche_name || 'industry'} reduce their cost per acquisition by an average of 47% within the first 90 days. And the best part? You can see everything happening in real-time through your custom dashboard."

**SOFT CLOSE:**
"I'd love to show you exactly how this would work for ${lead.business_name}. I can even run a free competitive analysis beforehand to show you what opportunities you're missing. Would you be open to a quick 15-minute screen share later this week?"

**HANDLING OBJECTIONS:**

*"We already have an agency"*
→ "That's great! Most of our clients do too. This actually complements what they're doing by giving you transparency and AI optimization they can't provide. Plus, you'll know exactly what's working and what isn't."

*"We don't have the budget"*
→ "I understand. That's actually why I'm calling - our clients typically save more in wasted ad spend than our service costs. Would it help if I showed you the potential savings in a free analysis?"

*"Not interested"*
→ "No problem at all. Just out of curiosity, what's your biggest marketing challenge right now? [Listen, then tie back if relevant]"

**BOOKING THE MEETING:**
"I have some time [suggest 2-3 specific times]. What works best for you?"

**FOLLOW-UP:**
"Perfect! I'll send you a calendar invite with a Zoom link. Also, if you can share your website and any competitor sites you track, I'll prepare that competitive analysis to make our time super valuable. Sound good?"`
      }
    }

    const template = templates[messageType]
    if (!template) {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
    }

    // Add some dynamic variations based on lead data
    let content = template.content
    
    // If no location, remove location-specific mentions
    if (!lead.city) {
      content = content.replace(` in ${lead.city}`, '')
    }
    
    // If no niche, use generic terms
    if (!lead.niche_name) {
      content = content.replace(/in the \${lead\.niche_name \|\| 'industry'}/g, '')
      content = content.replace(/\${lead\.niche_name \|\| 'businesses'}/g, 'businesses')
    }

    const response = {
      subject: template.subject,
      content: content,
      personalization_tips: [
        "Review and customize the message before sending",
        "Add specific details about their business if you've researched them",
        "Mention any mutual connections or recent achievements",
        "Adjust the tone based on their industry and company culture"
      ]
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating message:', error)
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
  }
} 
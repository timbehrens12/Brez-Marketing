import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

interface MessageTemplate {
  subject?: string;
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Generate message API called')
    
    const { userId } = auth()
    console.log('User ID:', userId)
    
    if (!userId) {
      console.log('No user ID found, returning unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { lead, messageType, brandInfo } = body

    if (!lead || !messageType) {
      console.log('Missing required fields:', { lead: !!lead, messageType })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Helper function to safely get lead properties
    const getLeadValue = (value: any, fallback: string = '') => value || fallback
    const businessName = getLeadValue(lead.business_name, 'your business')
    const ownerName = getLeadValue(lead.owner_name, 'there')
    const city = getLeadValue(lead.city)
    const niche = getLeadValue(lead.niche_name, 'industry')
    const brandName = getLeadValue(brandInfo?.name, '[Your Name]')

    console.log('Lead values:', { businessName, ownerName, city, niche, brandName })

    // Generate personalized message based on lead information and message type
    const generateTemplate = (type: string): MessageTemplate => {
      console.log('Generating template for type:', type)
      
      switch (type) {
        case 'email':
          return {
            subject: `Transform ${businessName}'s Marketing with AI-Powered Analytics`,
            content: `Hi ${ownerName},

I noticed ${businessName}${city ? ` in ${city}` : ''} and was impressed by your presence in the ${niche}.

I wanted to reach out because I've developed something unique that's helping businesses like yours achieve remarkable results:

🚀 **Our AI-Powered Marketing Dashboard** - A custom analytics platform that no other agency offers

Here's what makes it game-changing for ${businessName}:

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
- Proven results in the ${niche}

Would you be open to a brief 15-minute demo where I can show you exactly how this would work for ${businessName}? I can even run a free competitive analysis beforehand to show you immediate opportunities.

Best regards,
${brandName}

P.S. I'm only taking on 3 new clients this quarter to ensure quality. If you're interested, let's connect soon.`
          }

        case 'linkedin':
          return {
            content: `Hi ${ownerName},

I came across ${businessName} and was impressed by what you've built in the ${niche}.

I've developed an AI-powered marketing dashboard that's helping businesses like yours cut ad spend by 47% while increasing conversions by 3.2x.

What makes it unique:
• Real-time AI optimization (not just monthly reports)
• Custom dashboard just for your business
• Predictive analytics with 92% accuracy

I'd love to show you a quick demo and run a free competitive analysis for ${businessName}.

Interested in a brief chat?

Best,
${brandName}`
          }

        case 'sms':
          return {
            content: `Hi ${ownerName}! I help businesses like ${businessName} cut ad costs by 47% using our AI marketing platform. 

Unlike agencies, you get 24/7 AI optimization + custom dashboard. 

Free competitive analysis available. Interested? 

${brandName}`
          }

        case 'call':
          return {
            content: `**OPENING (Friendly & Direct):**
"Hi ${ownerName}, this is ${brandName}. I know you're busy running ${businessName}, so I'll be brief. I've developed an AI-powered marketing platform that's helping businesses cut their ad spend nearly in half while tripling conversions. Do you have 30 seconds for me to explain why I'm calling?"

**VALUE PROP (If Yes):**
"Great! So unlike traditional marketing agencies that give you monthly reports and hope for the best, we've built a custom AI dashboard that optimizes your campaigns 24/7. 

The AI literally watches your ads every minute and makes adjustments - kind of like having a world-class media buyer working around the clock, but at a fraction of the cost."

**CREDIBILITY:**
"We're seeing clients in the ${niche} reduce their cost per acquisition by an average of 47% within the first 90 days. And the best part? You can see everything happening in real-time through your custom dashboard."

**SOFT CLOSE:**
"I'd love to show you exactly how this would work for ${businessName}. I can even run a free competitive analysis beforehand to show you what opportunities you're missing. Would you be open to a quick 15-minute screen share later this week?"

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

        default:
          return {
            content: `Hi ${ownerName},

I wanted to reach out about ${businessName} and share something that could significantly impact your marketing results.

Our AI-powered marketing platform is helping businesses reduce ad spend by 47% while increasing conversions by 3.2x.

Would you be interested in a quick demo?

Best regards,
${brandName}`
          }
      }
    }

    const template = generateTemplate(messageType)
    console.log('Generated template:', { hasSubject: !!template.subject, contentLength: template.content.length })
    
    const response = {
      message: template.content,
      subject: template.subject,
      personalization_tips: [
        "Review and customize the message before sending",
        "Add specific details about their business if you've researched them",
        "Mention any mutual connections or recent achievements",
        "Adjust the tone based on their industry and company culture"
      ]
    }

    console.log('Sending response:', { hasMessage: !!response.message, hasSubject: !!response.subject })
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating message:', error)
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 })
  }
} 
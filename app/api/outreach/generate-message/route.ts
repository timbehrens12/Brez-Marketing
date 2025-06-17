import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { lead_id, message_type, lead_data } = await request.json()
    
    if (!lead_id || !message_type || !lead_data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Generate personalized message using AI
    const aiMessage = await generatePersonalizedMessage(lead_data, message_type)
    
    // Save the generated message to database
    const { data: message, error } = await supabase
      .from('outreach_messages')
      .insert({
        lead_id,
        message_type,
        subject: aiMessage.subject,
        content: aiMessage.content,
        status: 'generated',
        ai_generated: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving message:', error)
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      )
    }

    // Update lead status to contacted if it's new
    if (lead_data.status === 'new') {
      await supabase
        .from('leads')
        .update({ 
          status: 'contacted',
          last_contacted_at: new Date().toISOString()
        })
        .eq('id', lead_id)
    }

    // Create automated follow-up task
    await createFollowUpTask(supabase, lead_id, lead_data.business_name)

    return NextResponse.json({
      success: true,
      message: message,
      ai_content: aiMessage
    })

  } catch (error) {
    console.error('Error generating message:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generatePersonalizedMessage(lead: any, messageType: string) {
  const businessName = lead.business_name || 'your business'
  const ownerName = lead.owner_name || 'there'
  const industry = lead.niche_name || 'your industry'
  const location = lead.city && lead.state_province 
    ? `${lead.city}, ${lead.state_province}` 
    : 'your area'

  // Custom value propositions about the ERT dashboard
  const valueProps = [
    "exclusive access to our custom ERT dashboard that no other ad manager has",
    "AI-powered optimization features that automatically improve your ad performance",
    "proprietary analytics that give you a competitive edge over your competitors",
    "real-time insights that help you make data-driven decisions faster than ever",
    "automated optimization algorithms that work 24/7 to maximize your ROI"
  ]

  const industrySpecificBenefits = {
    'restaurants': 'drive more foot traffic and increase table bookings',
    'fitness': 'attract more gym members and personal training clients',
    'beauty': 'book more appointments and increase client retention',
    'automotive': 'generate more leads for car sales and service appointments',
    'real estate': 'find more qualified buyers and sellers in your market',
    'healthcare': 'attract more patients and improve your practice visibility',
    'legal': 'generate more qualified leads for your legal services',
    'home improvement': 'get more project inquiries and estimate requests',
    'retail': 'increase online sales and drive more store visits',
    'default': 'generate more qualified leads and increase your revenue'
  }

  const benefit = industrySpecificBenefits[industry.toLowerCase() as keyof typeof industrySpecificBenefits] 
    || industrySpecificBenefits.default

  const templates = {
    email: {
      subject: `Exclusive AI Dashboard Access for ${businessName} - 3x Better Results Than Traditional Ad Managers`,
      content: `Hi ${ownerName},

I noticed ${businessName} is doing great work in the ${industry} space in ${location}, and I wanted to reach out with something exclusive.

We've developed a custom ERT dashboard with AI optimization features that's currently only available to a select group of businesses. What makes this different from working with traditional ad managers is that you get:

• ${valueProps[0]}
• ${valueProps[1]} 
• ${valueProps[2]}

This means you can ${benefit} while your competitors are still using outdated methods.

The results speak for themselves - our clients typically see 3x better performance compared to other ad management services because of our proprietary AI technology.

Since you're in ${industry}, I think ${businessName} would be a perfect fit for this exclusive program.

Would you be interested in a quick 15-minute call to see how this could work for your business?

Best regards,
[Your Name]

P.S. - This dashboard access is limited and we're only onboarding a few businesses per month. If you're interested, I'd recommend we connect soon.`
    },

    linkedin_dm: {
      subject: `AI Dashboard Access for ${businessName}`,
      content: `Hi ${ownerName},

Saw your work with ${businessName} in ${industry} - impressive stuff!

Quick question: Are you getting the ad performance data you need to stay ahead of your competition?

We've built an exclusive ERT dashboard with AI optimization that's giving businesses like yours a major competitive advantage. Our clients typically outperform traditional ad managers by 3x because of our proprietary technology.

Since you're in ${industry}, I think this could really help ${businessName} ${benefit}.

Open to a quick chat about how this works?

Best,
[Your Name]`
    },

    instagram_dm: {
      subject: '',
      content: `Hey ${ownerName}! 👋

Love what you're doing with ${businessName}! 

Quick question - are you getting the ad insights you need to crush your competition in ${industry}?

We've got an exclusive AI dashboard that's helping businesses like yours ${benefit} with way better results than traditional ad managers.

Our secret? Proprietary AI optimization that works 24/7 📊✨

Interested in seeing how this could work for ${businessName}? 

Would love to share more! 🚀`
    },

    facebook_dm: {
      subject: '',
      content: `Hi ${ownerName},

I came across ${businessName} and was impressed by what you're doing in ${industry}!

I wanted to reach out because we have an exclusive AI-powered dashboard that's helping businesses like yours get significantly better ad results than traditional ad management.

What makes it special:
✅ ${valueProps[0]}
✅ ${valueProps[1]}
✅ Real competitive advantage over other businesses

Perfect for helping ${businessName} ${benefit}.

Would you be open to a quick conversation about how this works?

Thanks!
[Your Name]`
    },

    cold_call_script: {
      subject: `Cold Call Script for ${businessName}`,
      content: `[COLD CALL SCRIPT]

Opening:
"Hi ${ownerName}, this is [Your Name]. I'm calling about an exclusive opportunity for ${businessName}. Do you have just 2 minutes?"

[If yes, continue:]

Hook:
"I noticed you're doing great work in ${industry} in ${location}. The reason I'm calling is we've developed something that's giving businesses like yours a major competitive advantage over traditional ad managers."

Value Proposition:
"It's an exclusive ERT dashboard with AI optimization features that automatically improves your ad performance 24/7. Our clients typically see 3x better results because they have access to proprietary technology that no other ad manager has."

Industry Specific:
"For businesses in ${industry}, this typically means you can ${benefit} while your competitors are still using outdated methods."

Call to Action:
"I'd love to show you exactly how this works for ${businessName}. Are you available for a quick 15-minute call this week to see if this makes sense for you?"

Objection Handling:
- "We already have an ad manager" → "That's great! This actually enhances what they're doing with AI technology they don't have access to."
- "Not interested" → "I understand. Just to clarify - this isn't traditional ad management. It's exclusive AI technology. Can I send you a quick 2-minute video showing the difference?"
- "Call back later" → "Sure, when would be a better time? This opportunity is limited and I want to make sure ${businessName} doesn't miss out."

Closing:
"Perfect! I'll send you a calendar link and a brief overview of how this works. Looking forward to showing you how ${businessName} can get ahead of the competition."`
    }
  }

  return templates[messageType as keyof typeof templates] || templates.email
}

async function createFollowUpTask(supabase: any, leadId: string, businessName: string) {
  // Create automated follow-up task for 3 days later
  const followUpDate = new Date()
  followUpDate.setDate(followUpDate.getDate() + 3)

  await supabase
    .from('tasks')
    .insert({
      title: `Follow up with ${businessName}`,
      description: `Check if they've responded to the initial outreach message. If no response, send follow-up message.`,
      task_type: 'follow_up',
      priority: 'medium',
      status: 'pending',
      lead_id: leadId,
      due_date: followUpDate.toISOString().split('T')[0],
      ai_generated: true,
      ai_reasoning: 'Automated follow-up task created after initial outreach to maintain engagement',
      created_at: new Date().toISOString()
    })
} 
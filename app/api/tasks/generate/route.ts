import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { brandId, taskType = 'daily' } = body

    // Get leads and existing tasks for context
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('brand_id', brandId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    // Generate AI tasks based on lead pipeline
    const prompt = `
Analyze this lead pipeline and generate 5-8 actionable daily tasks for a marketing agency owner to maximize outreach success and lead conversion.

Current Lead Data:
${leads?.map(lead => `
- ${lead.business_name} (${lead.niche_name}, Score: ${lead.lead_score}, Status: ${lead.status}, Priority: ${lead.priority})
  Contact: ${lead.owner_name} - ${lead.email}
  Insights: ${lead.ai_insights}
  Last updated: ${new Date(lead.updated_at).toLocaleDateString()}
`).join('') || 'No leads available'}

Recent Task History:
${recentTasks?.map(task => `- ${task.title} (${task.status})`).join('\n') || 'No recent tasks'}

Generate tasks that include:
1. Follow-up actions for existing leads
2. Research tasks for high-priority prospects
3. Content creation for outreach
4. Relationship building activities
5. Pipeline optimization tasks

For each task, provide:
- title: Clear, actionable task name
- description: Detailed explanation of what to do
- type: (outreach, follow_up, research, content, admin)
- priority: (high, medium, low)
- estimated_duration: in minutes
- due_date: when it should be completed (today, tomorrow, this_week)
- lead_id: if task is specific to a lead (use lead ID from above)

Return as JSON array of task objects.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Simple task generation - cheap model works fine
      messages: [
        {
          role: "system",
          content: "You are a productivity and sales optimization AI. Generate specific, actionable tasks that will help a marketing agency owner maximize their lead conversion and business growth. Focus on high-impact activities that can be completed within the specified timeframe."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    })

    let aiTasks = []
    try {
      aiTasks = JSON.parse(completion.choices[0].message.content || '[]')
    } catch (error) {
      // Fallback to default tasks if AI parsing fails
      aiTasks = generateDefaultTasks(leads || [])
    }

    // Process and save tasks to database
    const tasksToInsert = aiTasks.map((task: any) => {
      const dueDate = calculateDueDate(task.due_date)
      return {
        user_id: userId,
        brand_id: brandId,
        title: task.title,
        description: task.description,
        type: task.type || 'outreach',
        priority: task.priority || 'medium',
        status: 'pending',
        due_date: dueDate,
        estimated_duration: task.estimated_duration || 30,
        lead_id: task.lead_id || null,
        ai_generated: true,
        created_at: new Date().toISOString()
      }
    })

    const { data, error } = await supabase
      .from('tasks')
      .insert(tasksToInsert)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 })
    }

    return NextResponse.json({ 
      tasks: data,
      message: `Generated ${data?.length || 0} tasks successfully`
    })

  } catch (error) {
    console.error('Task generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    )
  }
}

function calculateDueDate(dueDateString: string): string {
  const now = new Date()
  
  switch (dueDateString?.toLowerCase()) {
    case 'today':
      return now.toISOString()
    case 'tomorrow':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case 'this_week':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  }
}

function generateDefaultTasks(leads: any[]) {
  const defaultTasks = [
    {
      title: 'Review and prioritize new leads',
      description: 'Go through newly generated leads and assign priority scores based on business potential',
      type: 'admin',
      priority: 'high',
      due_date: 'today',
      estimated_duration: 20
    },
    {
      title: 'Send follow-up emails to contacted leads',
      description: 'Check for leads that were contacted 3-5 days ago and send follow-up messages',
      type: 'follow_up',
      priority: 'high',
      due_date: 'today',
      estimated_duration: 45
    },
    {
      title: 'Research high-priority prospects',
      description: 'Deep dive into top-scoring leads to gather more information for personalized outreach',
      type: 'research',
      priority: 'medium',
      due_date: 'today',
      estimated_duration: 30
    },
    {
      title: 'Create social media content for lead nurturing',
      description: 'Develop valuable content posts that can be shared to attract and nurture potential leads',
      type: 'content',
      priority: 'medium',
      due_date: 'tomorrow',
      estimated_duration: 60
    }
  ]

  // Add lead-specific tasks if leads exist
  if (leads.length > 0) {
    const highPriorityLeads = leads.filter(lead => lead.priority === 'high').slice(0, 3)
    
    highPriorityLeads.forEach(lead => {
      defaultTasks.push({
        title: `Call ${lead.business_name}`,
        description: `Schedule a discovery call with ${lead.owner_name} to discuss their marketing needs and present Facebook ads solutions`,
        type: 'outreach',
        priority: 'high',
        due_date: 'today',
        estimated_duration: 30,
        lead_id: lead.id
      })
    })
  }

  return defaultTasks
} 
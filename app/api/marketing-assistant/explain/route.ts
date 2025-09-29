import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, data, brandId } = await request.json()

    if (!type || !data) {
      return NextResponse.json({ error: 'Type and data are required' }, { status: 400 })
    }

    let explanation

    switch (type) {
      case 'recommendation':
        explanation = await explainRecommendation(data)
        break
      case 'budget_allocation':
        explanation = await explainBudgetAllocation(data)
        break
      case 'audience_expansion':
        explanation = await explainAudienceExpansion(data)
        break
      default:
        return NextResponse.json({ error: 'Invalid explanation type' }, { status: 400 })
    }

    return NextResponse.json(explanation)

  } catch (error) {
    console.error('Error generating explanation:', error)
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 })
  }
}

async function explainRecommendation(card: any) {
  // Generate explanation based on recommendation type and data
  let reasoning, insights, outcomes, steps
  
  console.log('Explaining recommendation:', { type: card.type, title: card.title, description: card.description })
  
  if (card.type === 'budget' || card.title?.includes('Budget') || card.title?.includes('Scaling')) {
    const campaignName = card.title?.split(' - ')[1] || 'your campaign'
    reasoning = `This budget optimization specifically targets ${campaignName}, which is showing strong efficiency signals. ${card.description || 'By scaling successful campaigns intelligently, you can capture more market opportunity while maintaining profitability.'}`
    insights = [
      card.rootCause || `Current performance shows ${card.projectedImpact?.confidence || 75}% confidence for scaling success`,
      "Budget increases on high-performing campaigns typically maintain 85-95% of original efficiency",
      "This scaling approach follows proven performance marketing best practices",
      "Risk is minimized through gradual implementation and close monitoring"
    ]
    outcomes = [
      { label: "Revenue Increase", value: "+25-40%", positive: true },
      { label: "ROAS Maintenance", value: "90-95%", positive: true },
      { label: "Scale Timeline", value: "3-7 days", positive: true },
      { label: "Risk Level", value: "Low", positive: true }
    ]
    steps = [
      "Navigate to your Meta Ads Manager campaign budget settings",
      "Increase daily budget by 20-25% initially (not 100% immediately)",
      "Monitor performance for 48-72 hours to ensure learning phase stability",
      "If performance maintains, continue scaling in 25% increments",
      "Set up automated rules to pause if ROAS drops below acceptable threshold"
    ]
  } else if (card.type === 'creative' || card.title?.includes('Creative') || card.title?.includes('Performance')) {
    const campaignName = card.title?.split(' - ')[1] || 'your campaign'
    reasoning = `Creative performance optimization for ${campaignName} is critical for maintaining campaign effectiveness. ${card.description || 'Fresh creatives prevent audience fatigue and can dramatically improve engagement rates and conversion performance.'}`
    insights = [
      card.rootCause || "Creative fatigue typically sets in after 3-7 days of consistent exposure",
      "New creative variants can improve CTR by 15-30% compared to fatigued ads",
      "A/B testing different messaging approaches identifies winning combinations",
      "Video content typically outperforms static images by 20-40% in most verticals"
    ]
    outcomes = [
      { label: "CTR Improvement", value: "+15-30%", positive: true },
      { label: "CPC Reduction", value: "-10-20%", positive: true },
      { label: "Testing Timeline", value: "5-7 days", positive: true },
      { label: "Success Rate", value: "70%", positive: true }
    ]
    steps = [
      "Create 3-5 new creative variants with different hooks or messaging angles",
      "Launch new creatives alongside existing ones in equal budget splits",
      "Run for 3-5 days to gather statistically significant data",
      "Pause underperforming creatives and scale the winners",
      "Repeat this process weekly to maintain fresh creative rotation"
    ]
  } else if (card.type === 'frequency' || card.title?.includes('Frequency') || card.title?.includes('Audience')) {
    reasoning = "Audience frequency optimization prevents ad fatigue and improves campaign efficiency. Over-serving the same users leads to declining performance and wasted budget."
    insights = [
      "Optimal frequency is typically 2-4 impressions per user per week",
      "Higher frequencies can lead to 40-60% increases in cost per action",
      "Frequency capping helps maintain fresh audience reach and engagement",
      "Well-managed frequency typically improves ROAS by 20-35%"
    ]
    outcomes = [
      { label: "CPA Reduction", value: "-20-30%", positive: true },
      { label: "Audience Refresh", value: "Weekly", positive: true },
      { label: "Budget Efficiency", value: "+25%", positive: true },
      { label: "Implementation", value: "1 day", positive: true }
    ]
    steps = [
      "Navigate to your campaign's ad set settings in Meta Ads Manager",
      "Find the 'Optimization & Delivery' section",
      "Set frequency cap to 3 impressions per 7 days",
      "Monitor performance for 5-7 days to see efficiency improvements",
      "Adjust frequency cap based on campaign performance and objectives"
    ]
  } else if (card.type === 'audience' || card.title?.includes('Tracking') || card.title?.includes('Conversion')) {
    reasoning = "Proper conversion tracking is fundamental to campaign optimization. Without accurate tracking, you're essentially flying blind and missing critical optimization opportunities."
    insights = [
      "Campaigns without proper tracking typically underperform by 30-50%",
      "Conversion tracking enables advanced bidding strategies and better audience building",
      "Proper attribution helps allocate budget to the most effective touchpoints",
      "Server-side tracking is becoming essential due to iOS 14.5+ privacy changes"
    ]
    outcomes = [
      { label: "Attribution Accuracy", value: "+80%", positive: true },
      { label: "Optimization Capability", value: "Enabled", positive: true },
      { label: "Setup Time", value: "2-4 hours", positive: true },
      { label: "Data Quality", value: "High", positive: true }
    ]
    steps = [
      "Install Facebook Pixel and Conversions API on your website",
      "Configure purchase events with proper value and currency parameters",
      "Test tracking using Facebook's Event Testing tool",
      "Verify attribution in Meta Events Manager after test purchases",
      "Allow 24-48 hours for the learning phase to optimize with new data"
    ]
  } else {
    // Generic fallback
    reasoning = "This optimization recommendation is based on performance analysis and industry best practices to improve your campaign effectiveness and return on ad spend."
    insights = [
      "Performance data indicates significant room for improvement in this area",
      "Similar optimizations have shown positive results across comparable campaigns",
      "This change aligns with current best practices and platform recommendations",
      "Implementation carries manageable risk with high potential upside"
    ]
    outcomes = [
      { label: "Expected Improvement", value: "+15-25%", positive: true },
      { label: "Implementation Time", value: "1-3 days", positive: true },
      { label: "Risk Level", value: "Low", positive: true },
      { label: "Confidence", value: `${card.projectedImpact?.confidence || 70}%`, positive: true }
    ]
    steps = [
      "Review the current campaign settings and performance metrics",
      "Implement the recommended changes gradually to minimize risk",
      "Monitor performance closely for the first 48-72 hours",
      "Make adjustments based on initial performance data",
      "Document results for future optimization reference"
    ]
  }

  return { reasoning, insights, outcomes, steps }
}

async function explainBudgetAllocation(allocation: any) {
  return {
    reasoning: `This budget allocation recommendation is based on your campaign's current efficiency metrics. With a ${allocation.currentRoas}x ROAS, there's clear opportunity to optimize spend distribution for maximum return.`,
    insights: [
      `Current daily spend of $${allocation.currentBudget} is generating a ${allocation.currentRoas}x ROAS`,
      `Efficiency analysis suggests optimal spend level is around $${allocation.suggestedBudget} daily`,
      `This adjustment could improve ROAS to approximately ${allocation.projectedRoas}x`,
      `${allocation.confidence}% confidence based on historical performance patterns`
    ],
    outcomes: [
      { label: "New Daily Budget", value: `$${allocation.suggestedBudget}`, positive: allocation.suggestedBudget > allocation.currentBudget },
      { label: "Projected ROAS", value: `${allocation.projectedRoas}x`, positive: true },
      { label: "Confidence Level", value: `${allocation.confidence}%`, positive: true },
      { label: "Risk Assessment", value: allocation.risk, positive: allocation.risk === 'low' }
    ],
    steps: [
      "Navigate to your campaign's budget settings in the advertising platform",
      `Adjust the daily budget from $${allocation.currentBudget} to $${allocation.suggestedBudget}`,
      "Enable automatic budget optimization if available",
      "Monitor performance for 3-5 days to assess impact",
      "Fine-tune budget based on initial results and performance trends"
    ]
  }
}

async function explainAudienceExpansion(expansion: any) {
  const typeExplanations = {
    lookalike: "Lookalike audiences leverage your existing high-converting customers to find similar prospects with comparable behaviors and characteristics.",
    geographic: "Geographic expansion targets new locations with similar demographics and market conditions to your current successful regions.",
    interest: "Interest-based expansion reaches users with related interests and behaviors that align with your product or service offerings.",
    demographic: "Demographic expansion tests adjacent age groups, income levels, or other characteristics based on your current top performers."
  }

  return {
    reasoning: `${typeExplanations[expansion.type as keyof typeof typeExplanations]} This ${expansion.type} expansion opportunity could increase your reach by ${(expansion.projectedReach - expansion.currentReach).toLocaleString()} users while maintaining cost efficiency.`,
    insights: [
      `Current reach: ${expansion.currentReach.toLocaleString()} users with strong performance`,
      `Expansion potential: +${(expansion.projectedReach - expansion.currentReach).toLocaleString()} additional qualified prospects`,
      `Estimated CPA of $${expansion.estimatedCpa} aligns with current cost efficiency goals`,
      `${expansion.confidence}% match confidence based on behavioral and performance similarities`
    ],
    outcomes: [
      { label: "Additional Reach", value: `+${(expansion.projectedReach - expansion.currentReach).toLocaleString()}`, positive: true },
      { label: "Estimated CPA", value: `$${expansion.estimatedCpa}`, positive: true },
      { label: "Match Confidence", value: `${expansion.confidence}%`, positive: true },
      { label: "Expansion Type", value: expansion.type, positive: true }
    ],
    steps: [
      "Access your advertising platform's audience creation tools",
      `Create a new ${expansion.type} audience based on your current high-performers`,
      "Set up a test campaign with 20% of your current budget allocation",
      "Run the test for 7-14 days to gather statistically significant data",
      "Scale successful segments and pause underperforming ones based on results"
    ]
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PlatformMetrics {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
  activeCampaigns: number;
  totalCampaigns: number;
}

interface DailyReport {
  date: string;
  overallStatus: 'healthy' | 'attention' | 'critical';
  summary: string;
  platforms: Array<{
    platform: string;
    status: 'healthy' | 'attention' | 'critical';
    summary: string;
    keyMetrics: {
      spend: string;
      performance: string;
      trend: 'up' | 'down' | 'stable';
    };
  }>;
  actionItems: Array<{
    platform: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
  }>;
  keyInsights: string[];
}

async function fetchPlatformData(supabase: any): Promise<PlatformMetrics[]> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  try {
    // Fetch Meta data
    const { data: metaData, error: metaError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .gte('date', yesterdayStr)
      .lte('date', todayStr);

    if (metaError) {
      console.error('Error fetching Meta data:', metaError);
    }

    // Fetch campaign counts
    const { data: metaCampaigns, error: metaCampaignError } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, status');

    if (metaCampaignError) {
      console.error('Error fetching Meta campaigns:', metaCampaignError);
    }

    // Process Meta data
    const metaMetrics: PlatformMetrics = {
      platform: 'Meta',
      spend: metaData?.reduce((sum: number, row: any) => sum + (parseFloat(row.spend) || 0), 0) || 0,
      impressions: metaData?.reduce((sum: number, row: any) => sum + (parseInt(row.impressions) || 0), 0) || 0,
      clicks: metaData?.reduce((sum: number, row: any) => sum + (parseInt(row.clicks) || 0), 0) || 0,
      conversions: metaData?.reduce((sum: number, row: any) => sum + (parseInt(row.conversions) || 0), 0) || 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
      activeCampaigns: metaCampaigns?.filter((c: any) => c.status === 'ACTIVE').length || 0,
      totalCampaigns: metaCampaigns?.length || 0,
    };

    // Calculate derived metrics
    if (metaMetrics.impressions > 0) {
      metaMetrics.ctr = (metaMetrics.clicks / metaMetrics.impressions) * 100;
    }
    if (metaMetrics.clicks > 0) {
      metaMetrics.cpc = metaMetrics.spend / metaMetrics.clicks;
    }
    if (metaMetrics.spend > 0) {
      metaMetrics.roas = metaMetrics.conversions / metaMetrics.spend;
    }

    // Placeholder for other platforms
    const tiktokMetrics: PlatformMetrics = {
      platform: 'TikTok',
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
      activeCampaigns: 0,
      totalCampaigns: 0,
    };

    const googleAdsMetrics: PlatformMetrics = {
      platform: 'Google Ads',
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
      activeCampaigns: 0,
      totalCampaigns: 0,
    };

    return [metaMetrics, tiktokMetrics, googleAdsMetrics];
  } catch (error) {
    console.error('Error fetching platform data:', error);
    return [];
  }
}

function generateRuleBasedReport(platformData: PlatformMetrics[]): DailyReport {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const metaData = platformData.find(p => p.platform === 'Meta');
  const tiktokData = platformData.find(p => p.platform === 'TikTok');
  const googleAdsData = platformData.find(p => p.platform === 'Google Ads');

  const platforms = [];
  const actionItems = [];
  const keyInsights = [];

  // Analyze Meta platform
  if (metaData) {
    let metaStatus: 'healthy' | 'attention' | 'critical' = 'healthy';
    let metaSummary = '';
    let metaTrend: 'up' | 'down' | 'stable' = 'stable';

    if (metaData.spend === 0) {
      metaStatus = 'critical';
      metaSummary = 'No spend detected today. Campaigns may be paused or budgets exhausted.';
      metaTrend = 'down';
      actionItems.push({
        platform: 'Meta',
        priority: 'high' as const,
        action: 'Check campaign status and budgets',
        reason: 'Zero spend detected - campaigns may be paused or out of budget'
      });
    } else if (metaData.ctr < 1.0) {
      metaStatus = 'attention';
      metaSummary = `Low CTR (${metaData.ctr.toFixed(2)}%) indicates ads may need optimization.`;
      actionItems.push({
        platform: 'Meta',
        priority: 'medium' as const,
        action: 'Optimize ad creative and targeting',
        reason: 'CTR below 1% suggests poor ad relevance'
      });
    } else if (metaData.cpc > 2.0) {
      metaStatus = 'attention';
      metaSummary = `High CPC ($${metaData.cpc.toFixed(2)}) may impact campaign efficiency.`;
      actionItems.push({
        platform: 'Meta',
        priority: 'medium' as const,
        action: 'Review bid strategy and audience targeting',
        reason: 'CPC above $2 may indicate inefficient targeting'
      });
    } else {
      metaSummary = `Campaigns performing well with ${metaData.activeCampaigns} active campaigns.`;
      metaTrend = 'up';
    }

    platforms.push({
      platform: 'Meta',
      status: metaStatus,
      summary: metaSummary,
      keyMetrics: {
        spend: `$${metaData.spend.toFixed(2)}`,
        performance: `${metaData.ctr.toFixed(2)}% CTR`,
        trend: metaTrend
      }
    });

    if (metaData.spend > 0) {
      keyInsights.push(`Meta accounts for $${metaData.spend.toFixed(2)} in daily spend with ${metaData.conversions} conversions`);
    }
  }

  // TikTok platform (placeholder)
  platforms.push({
    platform: 'TikTok',
    status: 'healthy' as const,
    summary: 'No campaigns currently active. Consider expanding to this platform.',
    keyMetrics: {
      spend: '$0.00',
      performance: 'Not active',
      trend: 'stable' as const
    }
  });

  // Google Ads platform (placeholder)
  platforms.push({
    platform: 'Google Ads',
    status: 'healthy' as const,
    summary: 'No campaigns currently active. Consider expanding to this platform.',
    keyMetrics: {
      spend: '$0.00',
      performance: 'Not active',
      trend: 'stable' as const
    }
  });

  // Overall status
  const criticalCount = platforms.filter(p => p.status === 'critical').length;
  const attentionCount = platforms.filter(p => p.status === 'attention').length;
  
  let overallStatus: 'healthy' | 'attention' | 'critical' = 'healthy';
  let summary = '';

  if (criticalCount > 0) {
    overallStatus = 'critical';
    summary = `${criticalCount} platform(s) need immediate attention. Review campaign statuses and budget allocations.`;
  } else if (attentionCount > 0) {
    overallStatus = 'attention';
    summary = `${attentionCount} platform(s) need optimization. Performance can be improved with targeted adjustments.`;
  } else {
    summary = 'All platforms are performing within expected parameters. Continue monitoring for optimization opportunities.';
  }

  // Add general insights
  const totalSpend = platformData.reduce((sum, p) => sum + p.spend, 0);
  const totalConversions = platformData.reduce((sum, p) => sum + p.conversions, 0);
  
  if (totalSpend > 0) {
    keyInsights.push(`Total daily spend: $${totalSpend.toFixed(2)} across all platforms`);
  }
  if (totalConversions > 0) {
    keyInsights.push(`${totalConversions} total conversions with an average cost per conversion of $${(totalSpend / totalConversions).toFixed(2)}`);
  }

  if (actionItems.length === 0) {
    actionItems.push({
      platform: 'General',
      priority: 'low' as const,
      action: 'Monitor performance trends',
      reason: 'All platforms stable - continue regular monitoring'
    });
  }

  return {
    date: today,
    overallStatus,
    summary,
    platforms,
    actionItems,
    keyInsights: keyInsights.length > 0 ? keyInsights : ['No significant insights for today - continue monitoring performance']
  };
}

async function generateAIReport(platformData: PlatformMetrics[]): Promise<DailyReport> {
  try {
    const prompt = `
You are a marketing performance analyst. Based on the following platform data, generate a comprehensive daily report.

Platform Data:
${JSON.stringify(platformData, null, 2)}

Please provide a JSON response with the following structure:
{
  "date": "Today's date in readable format",
  "overallStatus": "healthy|attention|critical",
  "summary": "Brief executive summary of overall performance",
  "platforms": [
    {
      "platform": "Platform name",
      "status": "healthy|attention|critical",
      "summary": "Platform-specific summary",
      "keyMetrics": {
        "spend": "Formatted spend amount",
        "performance": "Key performance indicator",
        "trend": "up|down|stable"
      }
    }
  ],
  "actionItems": [
    {
      "platform": "Platform name",
      "priority": "high|medium|low",
      "action": "Specific action to take",
      "reason": "Why this action is needed"
    }
  ],
  "keyInsights": ["List of key insights and observations"]
}

Guidelines:
- healthy: CTR > 1%, CPC < $2, ROAS > 1, no major issues
- attention: CTR 0.5-1%, CPC $2-3, ROAS 0.5-1, minor optimization needed
- critical: CTR < 0.5%, CPC > $3, ROAS < 0.5, or zero spend
- Focus on actionable insights
- Be specific about numbers and metrics
- Prioritize issues that need immediate attention
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a marketing performance analyst. Provide clear, actionable insights based on campaign data. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse AI response
    const report = JSON.parse(aiResponse);
    return report;
  } catch (error) {
    console.error('Error generating AI report:', error);
    // Fallback to rule-based report
    return generateRuleBasedReport(platformData);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Fetch platform data
    const platformData = await fetchPlatformData(supabase);
    
    // Generate AI report (with fallback to rule-based)
    const report = await generateAIReport(platformData);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error in daily report API:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily report' },
      { status: 500 }
    );
  }
} 
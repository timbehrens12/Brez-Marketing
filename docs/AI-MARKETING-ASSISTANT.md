# AI Marketing Assistant

## Overview

The AI Marketing Assistant is a comprehensive, AI-powered marketing dashboard designed to automate campaign analysis, detect anomalies, provide recommendations, and forecast performance. It's inspired by Triple Whale and provides an ultimate AI media buyer experience.

## Features

### 1. Blended Marketing Stats
- **Total Spend**: Aggregated spending across all platforms
- **ROAS (Return on Ad Spend)**: Overall marketing efficiency metric
- **Conversions**: Total conversion count
- **CTR (Click-Through Rate)**: Average engagement rate
- **CPC (Cost Per Click)**: Average cost for each click
- **CPL (Cost Per Lead)**: Average cost per conversion
- **Impressions**: Total ad views
- **Reach**: Unique users reached

### 2. Daily AI Insights
- Automated daily performance summary
- Alert system (success/warning/error) for important events
- Actionable recommendations based on current performance
- Updates automatically each day with fresh analysis

### 3. Campaign Management
- **Platform Support**: Currently Meta (Facebook/Instagram), with Google Ads and TikTok coming soon
- **Campaign Table**: Shows all active campaigns with key metrics
- **AI Recommendations**: Each campaign gets an AI-powered recommendation
  - Green: Campaign performing well (e.g., "Increase budget")
  - Yellow: Needs optimization (e.g., "Reduce CPC targeting")
  - Red: Underperforming (e.g., "Pause underperforming ads")
- **Detailed Analysis**: Click any recommendation for in-depth analysis including:
  - Current status assessment
  - Implementation steps
  - Expected impact
  - 7-day forecast

### 4. Creative Analysis
- **Creative Performance Grid**: Visual display of all running creatives
- **Sorting Options**: Sort by ROAS, CTR, or Spend
- **Filtering**: Filter by status (Active/Paused)
- **Creative Details**: 
  - Thumbnail preview
  - Performance metrics (ROAS, CTR, Spend, CPC)
  - Campaign association
  - Creative type (Image/Video)

### 5. AI Marketing Insights
- **Performance Analysis**: Deep dive into current performance trends
- **7-Day Forecast**: AI-powered predictions for the next week
- **Anomaly Detection**: Identifies unusual patterns or issues
- **Interactive Charts**:
  - Weekly performance trends (spend vs revenue)
  - Platform distribution pie chart
- **Generated Insights**:
  - Key findings with actionable items
  - Prioritized opportunities (high/medium/low)
  - Expected outcomes for each recommendation

## Technical Implementation

### Frontend Architecture
- Built with Next.js and TypeScript
- Uses Tailwind CSS for styling with a dark theme
- Recharts for data visualization
- shadcn/ui components for consistent UI

### Data Flow
1. Fetches data from Supabase tables:
   - `meta_campaigns`: Campaign-level data
   - `meta_adsets`: Ad set information
   - `meta_ads`: Individual ad/creative data
   - `brands`: Brand settings and configuration

2. Processes data to calculate blended metrics

3. Makes AI API calls for:
   - Campaign recommendations
   - Daily insights generation
   - Detailed analysis
   - Performance insights

### AI Integration
The page integrates with OpenAI GPT-4 through several endpoints:
- `/api/ai/campaign-analysis`: Quick campaign recommendations
- `/api/ai/generate-report`: Daily AI insights
- `/api/ai/recommendations`: Detailed campaign analysis
- `/api/ai/insights`: Performance analysis and forecasting

## Brand-Specific Features

The system adapts recommendations based on:
- Brand settings (stored in the `brands` table)
- Seasonal events (Black Friday, holidays, etc.)
- Business type (e-commerce, lead generation, services)
- Current campaigns and historical performance

## Future Enhancements

### Platform Expansion
- Google Ads integration
- TikTok Ads integration
- LinkedIn Ads support
- Pinterest Ads support

### Advanced Features
- Automated budget optimization
- Creative A/B testing recommendations
- Audience expansion suggestions
- Cross-platform attribution
- Custom alert thresholds
- Automated campaign creation
- Competitive analysis

### AI Capabilities
- Predictive budget allocation
- Creative fatigue detection
- Seasonal trend analysis
- Customer lifetime value predictions
- Multi-touch attribution modeling

## Usage

1. Navigate to the Marketing Assistant page from the main navigation
2. Select your brand using the brand selector
3. View the daily AI insight for immediate actionable items
4. Review blended stats for overall performance
5. Check campaign recommendations and click for details
6. Analyze creative performance in the Creative Analysis tab
7. Generate custom insights using the AI Insights tab

## Best Practices

1. **Daily Review**: Check the daily AI insight each morning
2. **Act on Recommendations**: Implement high-priority recommendations quickly
3. **Monitor Trends**: Use the charts to spot patterns
4. **Test Suggestions**: A/B test AI recommendations before full implementation
5. **Regular Analysis**: Generate fresh insights weekly

## Troubleshooting

### No Data Showing
- Ensure Meta Ads account is connected
- Check that campaigns are active
- Verify data sync has completed

### AI Recommendations Not Loading
- Check OpenAI API key is configured
- Ensure sufficient API credits
- Try refreshing the page

### Performance Issues
- Data is limited to active campaigns only
- Large accounts may take longer to load
- Use date filters to reduce data volume

## API Endpoints

### Campaign Analysis
```
POST /api/ai/campaign-analysis
Body: {
  campaign: CampaignData,
  brandStats: BlendedStats,
  brandSettings: any
}
```

### Generate Daily Report
```
POST /api/ai/generate-report
Body: {
  stats: BlendedStats,
  campaigns: CampaignData[],
  brandSettings: any,
  date: string
}
```

### Get Detailed Recommendations
```
POST /api/ai/recommendations
Body: {
  campaign: CampaignData,
  brandSettings: any,
  requestType: 'detailed'
}
```

### Generate Insights
```
POST /api/ai/insights
Body: {
  type: 'performance' | 'forecast' | 'anomalies',
  stats: BlendedStats,
  campaigns: CampaignData[],
  brandSettings: any
}
``` 
# Marketing Dashboard

A comprehensive marketing analytics dashboard for tracking and visualizing performance across multiple platforms including Shopify, Meta (Facebook/Instagram), and Google Ads.

## Features

- **Multi-platform Integration**: Connect to Shopify, Meta (Facebook/Instagram), and Google Ads
- **Unified Dashboard**: View all your marketing performance in one place
- **Real-time Analytics**: Track revenue, ROAS, ad spend, and more
- **Campaign Insights**: Analyze campaign performance across platforms
- **Customer Geography**: Visualize customer locations on an interactive 3D globe
- **Customizable Widgets**: Arrange dashboard components to suit your needs

## Setup

### Prerequisites

- Node.js 18 or higher
- Supabase account for database
- Accounts on platforms you want to integrate (Shopify, Meta, Google Ads)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd marketing-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Then edit `.env.local` to add your API keys and credentials.

4. Run the development server:
```bash
npm run dev
```

5. Setup database tables:
```bash
# Run these scripts in your Supabase SQL editor
# See scripts directory for SQL files
```

## Platform Integration Guide

### Meta (Facebook/Instagram) Integration

#### Setup

1. Create a Facebook Developer account at [developers.facebook.com](https://developers.facebook.com/)
2. Create a new app with "Business" type
3. Add the "Marketing API" product to your app
4. Generate a system user token with the following permissions:
   - ads_management
   - ads_read
   - business_management
   - public_profile
5. Enter the token in your dashboard settings

#### Troubleshooting Meta Integration

If you're experiencing issues with Meta data not appearing in your dashboard:

1. **Check Meta Connection Status**:
   - Navigate to `/api/meta/diagnose` to see connection status
   - Verify that your access token is valid and has the correct permissions

2. **Verify Campaign Status**:
   - Ensure you have at least one active (not draft) campaign
   - Meta only reports data for campaigns that have impressions or clicks
   - New campaigns may take 24-48 hours to start showing data

3. **Database Table Setup**:
   - Ensure the `meta_ad_insights` table exists in your Supabase database
   - You can run the SQL script at `scripts/create-meta-tables.sql` to create this table

4. **Manual Data Refresh**:
   - Use the "Refresh Meta Data" button on the Meta tab to clear existing data and trigger a new sync
   - Check for any error messages in the console

5. **Understanding Meta Data Delay**:
   - Meta's reporting API typically has a 24-hour delay
   - Recent campaigns may not show data immediately

## License

[MIT](LICENSE)

## Support

For help and support, please open an issue on the repository or contact the development team. 
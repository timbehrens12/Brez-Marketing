# Brez Marketing Dashboard

Marketing dashboard for tracking ad campaign performance across different platforms.

## Features

### Campaign Performance Tracking
- Track spend, impressions, clicks, conversions, and other key metrics
- View campaign status and budget information
- Compare performance across different platforms

### Date Range Filtering
- Filter campaign performance data by date range
- View historical performance trends
- Compare current period with previous periods

### Platforms
- Meta (Facebook & Instagram)
- Google Ads (coming soon)
- TikTok (coming soon)

## Getting Started

### Prerequisites
- Node.js 16+
- Supabase account
- Meta Business Account with access to ads

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Update `.env.local` with your credentials
5. Run the development server:
   ```bash
   npm run dev
   ```

### Database Setup
Run the SQL scripts in the `scripts` directory to set up the database schema.

## Recent Updates

### Meta Campaign Date Range Filtering (March 2025)
Added the ability to filter campaign data by date range:
- Created a new table to store daily campaign metrics
- Added API endpoints for fetching date-specific data
- Updated UI to support date range selection
- Improved budget detection for more accurate reporting

See `scripts/README.md` for more details on implementation.

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
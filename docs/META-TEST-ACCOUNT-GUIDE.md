# Setting Up Meta Test Accounts for Development

This guide provides step-by-step instructions for creating and using Meta (Facebook/Instagram) test ad accounts for development and testing purposes without spending real money.

## Benefits of Test Accounts

- **No Real Spending**: Test campaigns without charging real money
- **Realistic Data**: Get actual campaign structure and reporting data
- **Safe Testing**: Experiment with the API without affecting production accounts
- **Development Friendly**: Test integration before connecting to real ad accounts

## Prerequisites

1. A Meta Business Manager account
2. Admin or Developer access to the Business Manager
3. A Facebook Developer account linked to your Business Manager

## Step 1: Create a Test Ad Account

1. Log in to [Meta Business Manager](https://business.facebook.com/)
2. Click on the menu icon (≡) in the top left
3. Select **Business Settings**
4. In the left menu, navigate to **Accounts** → **Ad Accounts**
5. Click **Add** dropdown → Select **Create a Test Account**
6. Name your test account (e.g., "Dashboard Development Test Account")
7. Click **Create Test Account**

## Step 2: Set Up Your Test Ad Account

1. Once created, your test account will appear in the ad accounts list
2. Click on the account name to open the settings
3. Under **People**, add yourself with **Admin** access
4. Under **Ad Account Roles**, ensure you have full admin permissions

## Step 3: Create Test Campaigns

1. Go to [Meta Ads Manager](https://business.facebook.com/adsmanager/)
2. Select your test ad account from the account dropdown
3. Click **Create** to start creating a campaign
4. Select an objective (e.g., "Traffic" or "Engagement")
5. Set up your campaign:
   - **Campaign Name**: Give it a descriptive name like "Test Campaign for Dashboard"
   - **Budget**: Set a daily budget (the amount doesn't matter as it's a test account)
   - **Audience**: Create a basic audience
   - **Placements**: Use automatic placements
   - **Ad Creative**: Create a simple ad with placeholder image and text

6. Review and publish your campaign

## Step 4: Generate Test Data

For a test account to report data, you need to simulate campaign activity:

1. In Ads Manager, find your test campaign
2. Click on the campaign name to open it
3. Click on the **Tools** dropdown in the top menu
4. Select **Test Events**
5. Choose **Create Test Event**
6. Select event types:
   - Impressions
   - Clicks
   - Conversions
7. Enter the number of events to simulate
8. Click **Submit**

Note: Test events may take a few hours to appear in the reporting data.

## Step 5: Connect Your Test Account to the Dashboard

1. In your Marketing Dashboard, go to the Settings page
2. Navigate to the Integrations tab
3. Click on "Connect Meta Account"
4. Use your Developer App ID and access token
5. Select your test ad account from the list of available accounts
6. Complete the connection process

## Step 6: Verify Data in Dashboard

1. Go to the Meta tab in your dashboard
2. Click the "Refresh Meta Data" button to trigger a sync
3. Wait a few moments for the data to load
4. Verify that your test campaigns and data appear in the dashboard

## Limitations of Test Accounts

- **Limited Reporting Data**: Some advanced reporting metrics may not be available
- **No Instagram Shopping**: You cannot test Instagram Shopping features
- **No Real-world Performance**: Data doesn't reflect actual ad performance
- **Expiration**: Test accounts may expire after a certain period of inactivity

## Troubleshooting Test Accounts

### Test Data Not Appearing

1. Make sure you've generated test events as described in Step 4
2. Wait at least 24 hours for data to propagate through Meta's systems
3. Verify your test account is still active in Business Manager

### API Access Issues

1. Ensure your Developer App has the Marketing API product added
2. Check that your access token has the following permissions:
   - ads_management
   - ads_read
   - business_management
3. Verify that your app is properly connected to the Business Manager

### Missing Test Account

If your test account doesn't appear in your ad account list:

1. In Business Settings, go to **Ad Accounts**
2. Click **Add** → **Claim Ad Account**
3. Enter the test account ID (should start with "act_")
4. Click **Claim Ad Account**

## Best Practices

1. Clearly label all test campaigns to distinguish them from real campaigns
2. Periodically create new test data to ensure your account remains active
3. Create multiple test campaigns with different objectives to test all dashboard features
4. When testing is complete, set the campaigns to "paused" status

## Moving to Production

When you're ready to connect real ad accounts:

1. Follow the same connection process but select your production ad account
2. Verify data is flowing correctly from your real campaigns
3. Consider keeping the test account connected for future development testing 
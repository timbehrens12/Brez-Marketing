# GoHighLevel Integration Setup

This guide will help you integrate the onboarding form with GoHighLevel.

## ✅ What's Already Working

- ✅ Onboarding form submissions are saved to Supabase
- ✅ All form data is stored in the `onboarding_submissions` table
- ✅ Form works even without GoHighLevel configured

## 🚀 GoHighLevel Integration (Optional)

### Step 1: Get Your GoHighLevel API Key

1. Log into your GoHighLevel account
2. Go to **Settings → API Keys**
3. Click **Create API Key**
4. Copy the API key

### Step 2: Get Your Location ID

1. In GoHighLevel, go to **Settings → Locations**
2. Find your location and copy the **Location ID**

### Step 3: (Optional) Get Pipeline and Stage IDs

If you want to automatically create opportunities in a specific pipeline:

1. Go to **Opportunities** in GoHighLevel
2. Click on your pipeline settings
3. Copy the **Pipeline ID**
4. Copy the **Stage ID** for where you want new submissions to go (e.g., "New Lead")

### Step 4: Add Environment Variables to Vercel

1. Go to your Vercel project: https://vercel.com
2. Navigate to **Settings → Environment Variables**
3. Add the following variables:

```
GOHIGHLEVEL_API_KEY=your_api_key_here
GOHIGHLEVEL_LOCATION_ID=your_location_id_here
GOHIGHLEVEL_PIPELINE_ID=your_pipeline_id_here (optional)
GOHIGHLEVEL_STAGE_ID=your_stage_id_here (optional)
```

4. Make sure to add them for **Production**, **Preview**, and **Development** environments
5. **Redeploy your app** for the changes to take effect

## 📊 What Happens When Someone Submits the Form

### Without GoHighLevel configured:
1. ✅ Form data is saved to Supabase
2. ✅ You get console logs of the submission
3. ✅ User sees success message

### With GoHighLevel configured:
1. ✅ Form data is saved to Supabase
2. ✅ A new **Contact** is created in GoHighLevel with:
   - Name, email, phone, company
   - Address information
   - Website URL
   - Tags: "Onboarding", "Website Build"
   - Custom fields for services, hours, etc.
3. ✅ An **Opportunity** is created in your pipeline with:
   - Name: "Website Build - [Business Name]"
   - Contact linked
   - All form details in notes
   - Assigned to the stage you specified
4. ✅ Supabase record is updated with GoHighLevel IDs
5. ✅ User sees success message

## 🔍 Testing the Integration

1. Submit a test through `/onboarding`
2. Check Supabase for the saved record
3. Check GoHighLevel for the new contact and opportunity
4. Check Vercel logs for success/error messages

## 🛠️ Troubleshooting

### "GoHighLevel sync error (non-fatal)"
- The form will still save to Supabase
- Check your API key and Location ID
- Verify the API key has proper permissions

### Contact created but no opportunity
- Check if `GOHIGHLEVEL_PIPELINE_ID` is set
- Verify the pipeline exists in your GoHighLevel account

### Need to view saved submissions?
Query Supabase directly:
```sql
SELECT * FROM onboarding_submissions 
ORDER BY created_at DESC;
```

## 📧 Next Steps: Email Notifications

To send email notifications to builds@tlucasystems.com:

1. Add an email service like **Resend**, **SendGrid**, or **Postmark**
2. Get an API key
3. Update `app/api/onboarding/route.ts` with email sending logic
4. Uncomment the TODO section

## 🎯 Automation Ideas

With GoHighLevel integration, you can:
- **Auto-assign** new onboarding submissions to team members
- **Send SMS/Email** confirmations to clients
- **Trigger workflows** for project kickoff
- **Schedule calls** automatically
- **Create tasks** in your pipeline


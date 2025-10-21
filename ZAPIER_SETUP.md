# Zapier Integration Setup for Onboarding Forms

## 📋 Step-by-Step Setup

### Step 1: Create a Zap in Zapier

1. Go to [zapier.com](https://zapier.com) and log in
2. Click **Create Zap**
3. Name it: "TLUCA Onboarding Form Notifications"

### Step 2: Set Up Webhook Trigger

1. **Choose Trigger App**: Search for "Webhooks by Zapier"
2. **Select Trigger Event**: "Catch Hook"
3. **Copy the Webhook URL** - It will look like:
   ```
   https://hooks.zapier.com/hooks/catch/[your-id]/[unique-key]/
   ```

### Step 3: Add Webhook URL to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add a new variable:
   - **Name**: `ZAPIER_WEBHOOK_URL`
   - **Value**: Paste your Zapier webhook URL
   - **Environment**: Production (and Preview if you want to test)
5. Click **Save**
6. **Redeploy** your site (Vercel will prompt you)

### Step 4: Test the Connection

1. Go to `tlucasystems.com/onboarding`
2. Fill out the form (you can use test data)
3. Submit the form
4. Go back to Zapier - it should show "We found a request!"
5. Click **Continue** to proceed

### Step 5: Set Up Actions (What Happens Next)

Now you can add actions to your Zap. Here are recommended options:

#### Option A: Email Notification (Simplest)
1. **Action App**: Gmail / Outlook / Email by Zapier
2. **Action Event**: Send Email
3. **Set up action**:
   - **To**: builds@tlucasystems.com (or your email)
   - **Subject**: `🚨 New Onboarding Form: {{business_name}}`
   - **Body**: Use the `formatted_summary` field - it's pre-formatted!
   
   Or build custom:
   ```
   NEW CLIENT ONBOARDING RECEIVED!
   
   📋 Business: {{business_name}}
   👤 Contact: {{contact_name}}
   📧 Email: {{business_email}}
   📱 Phone: {{business_phone}}
   
   🏢 Services: {{services_offered}}
   
   🔔 Lead Alerts: {{lead_alert_method}}
   
   🌐 Domain: {{current_domain}}
   Need domain help: {{need_domain_help}}
   
   📝 Special Notes: {{special_notes}}
   
   View full details in Supabase: {{submission_id}}
   ```

#### Option B: Slack Notification
1. **Action App**: Slack
2. **Action Event**: Send Channel Message
3. **Set up action**:
   - **Channel**: #onboarding (or your channel)
   - **Message Text**:
   ```
   🎉 *NEW CLIENT ONBOARDING!*
   
   *Business:* {{business_name}}
   *Contact:* {{contact_name}} ({{business_email}})
   *Phone:* {{business_phone}}
   
   *Services:* {{services_offered}}
   *Lead Alerts:* {{lead_alert_method}}
   
   See full details in dashboard
   ```

#### Option C: Add to Google Sheets
1. **Action App**: Google Sheets
2. **Action Event**: Create Spreadsheet Row
3. **Set up action**:
   - Create a spreadsheet with columns matching the form fields
   - Map each Zapier field to a column

#### Option D: Create Task in Project Management
- **Asana**: Create a Task
- **Trello**: Create a Card
- **ClickUp**: Create a Task
- **Monday.com**: Create an Item

#### Option E: Multiple Actions (Recommended!)
You can add multiple actions to one Zap:
1. Send Email → builds@tlucasystems.com
2. Send Slack notification → #onboarding
3. Add row to Google Sheets for tracking
4. Create task in your project management tool

### Step 6: Turn On Your Zap

1. Review all settings
2. Click **Publish** / **Turn On Zap**
3. Test with a real form submission!

## 🎯 What Data is Sent to Zapier

The webhook sends ALL form data including:

### Core Info
- `submission_id` - Unique ID in Supabase
- `business_name`
- `contact_name`
- `business_email`
- `business_phone`

### Business Details
- `business_address`
- `business_description`
- `services_offered`
- `operating_hours`
- `service_areas`

### Branding
- `logo_file` (URL)
- `color_scheme`
- `slogan`
- `has_about_us` (true/false)
- `has_meet_the_team` (true/false)
- `inspiration_sites` (array)

### Online Presence
- `has_existing_website`
- `current_domain`
- `need_domain_help`
- `desired_domain`
- `has_google_business`
- `social_links` (object with facebook, instagram, linkedin)

### Leads & Communication
- `lead_alert_method` ("email", "sms", or "both")
- `alert_phone`
- `alert_email`
- `lead_form_fields` (array of selected fields)
- `bookings_payments` (selected option)
- `has_portfolio`
- `has_reviews`

### Final Details
- `owns_domain`
- `owned_domain`
- `dns_manager`
- `compliance_needs` (array)
- `special_notes`

### Metadata
- `submitted_at` (ISO timestamp)
- `formatted_summary` - **Pre-formatted text of entire form** ⭐

## 🔧 Troubleshooting

### Webhook Not Receiving Data
1. Check Vercel environment variables are set
2. Redeploy after adding the variable
3. Check Vercel deployment logs for "Sent to Zapier webhook"

### Form Submits But Zap Doesn't Trigger
1. Verify webhook URL is correct in Vercel
2. Check if webhook URL has expired (Zapier webhooks don't expire unless you delete the Zap)
3. Look at Zapier Task History for errors

### Getting Errors in Zapier
1. Check the error message in Zapier Task History
2. Verify all required fields in your actions are mapped
3. Test with a fresh form submission

## 💡 Pro Tips

1. **Use `formatted_summary`** - It's already nicely formatted for emails!
2. **Set up filters** - Only notify for certain services or conditions
3. **Add delays** - Wait 5 minutes before creating tasks to batch multiple submissions
4. **Multi-step Zaps** - Create contact in CRM, send notification, add to sheet all at once
5. **Zapier Paths** - Route different types of clients to different workflows

## 🎉 You're Done!

Every form submission will now:
1. ✅ Save to Supabase
2. ✅ Trigger your Zapier workflow
3. ✅ Send notifications however you configured

No GoHighLevel API needed - Zapier handles everything! 🚀


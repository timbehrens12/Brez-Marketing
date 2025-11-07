# ClickUp Onboarding Integration Setup

This guide explains how to set up ClickUp to automatically create tasks when clients submit the onboarding form.

## Overview

When a client completes the onboarding form, the system will:
1. Save the data to Supabase ✅
2. Send webhook to GoHighLevel ✅
3. **Create a task in ClickUp** with all submission details ✅

## Setup Steps

### 1. Get Your ClickUp API Key

1. Go to ClickUp Settings → Apps
2. Click "Generate" under API Token
3. Copy your API key (starts with `pk_`)

### 2. Find Your List ID

1. Open the ClickUp list where you want tasks created
2. Look at the URL: `https://app.clickup.com/[team_id]/v/li/[list_id]`
3. Copy the `list_id` (it's a number like `901234567890`)

### 3. Add Environment Variables

Add these to your `.env.local` (development) and Vercel (production):

```env
# Required
CLICKUP_API_KEY=pk_your_api_key_here
CLICKUP_LIST_ID=901234567890

# Optional - Custom Fields (if you want to use them)
CLICKUP_CUSTOM_FIELD_CLIENT_NAME=field_id_here
CLICKUP_CUSTOM_FIELD_CLIENT_EMAIL=field_id_here
CLICKUP_CUSTOM_FIELD_CLIENT_PHONE=field_id_here
```

### 4. (Optional) Set Up Custom Fields

If you want to use custom fields in ClickUp:

1. Go to your List Settings → Custom Fields
2. Create these fields:
   - **Client Name** (Text)
   - **Client Email** (Email or Text)
   - **Client Phone** (Text or Phone)
3. Get each field ID:
   - Click on the field
   - Look at the URL or use the ClickUp API to get field IDs
4. Add the field IDs to your environment variables

## What Gets Created in ClickUp

### Task Name
```
Website Build - [Business Name]
```

### Task Description
The task description includes ALL onboarding form data organized into sections:

- **Client Information** - Name, business, contact details, location
- **Services Offered** - Primary and secondary services
- **Service Areas** - Market type and cities served
- **Branding & Media** - Logo URL, gallery images, brand colors, design constraints
- **About & Messaging** - About text and tagline
- **Site Contact Details** - Display phone/email, business hours, preferred contact
- **Social Media & Online Presence** - Facebook, Instagram, Google Business links
- **Domain Information** - Current domain or purchase request
- **Internal Notes** - Any special requests from the client

### Task Properties
- **Status:** "to do" (can be customized)
- **Priority:** Normal (3)
- **Tags:** `onboarding`, `website-build`, `[business-type]`

## Testing

1. Submit a test onboarding form
2. Check your ClickUp list for the new task
3. Verify all data appears correctly in the task description
4. Check console logs for confirmation: `✅ Created ClickUp task: [task_id]`

## Troubleshooting

### Task not appearing in ClickUp

1. **Check environment variables are set** in Vercel
2. **Verify API key** has permission to create tasks
3. **Check List ID** is correct
4. **Look at server logs** for error messages

### Missing data in task description

- All form fields are included in the description
- Optional fields show as "Not provided" if empty
- Check the `emailBody` variable if you need to adjust formatting

### Custom fields not working

- Custom fields are optional
- If field IDs aren't set, they're automatically skipped
- Verify field IDs match your ClickUp workspace

## Database Schema

The system also saves ClickUp task info to Supabase:

```sql
onboarding_submissions
  - clickup_task_id (TEXT) - The ClickUp task ID
  - clickup_task_url (TEXT) - Direct link to the task
```

Run the migration:
```bash
# Apply the migration to add ClickUp fields
supabase db push
```

## Workflow for Operators

1. **New submission comes in** → Task automatically created in ClickUp
2. **Operator reviews task** → All client info is in the description
3. **Build the website** → Use the provided details
4. **Mark task as complete** → Client is notified (if you set up automations)

## Advanced: ClickUp Automations

You can set up ClickUp automations to:
- Assign tasks to specific team members based on business type
- Send notifications when tasks are created
- Move tasks through different statuses
- Trigger webhooks back to your app when tasks are completed

## API Reference

- **ClickUp API Docs:** https://clickup.com/api
- **Create Task Endpoint:** `POST /list/{list_id}/task`
- **Rate Limits:** 100 requests per minute

## Support

If you need help:
1. Check ClickUp API documentation
2. Review server logs for error messages
3. Test with a simple API call using Postman/curl first


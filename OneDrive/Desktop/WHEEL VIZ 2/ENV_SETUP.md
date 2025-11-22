# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google AI (Gemini) Configuration
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Optional: Image Generation Service
# If using Replicate for Stable Diffusion
REPLICATE_API_TOKEN=your_replicate_api_token

# Optional: Other Image Generation Services
# OPENAI_API_KEY=your_openai_api_key
# STABILITY_API_KEY=your_stability_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## How to Get API Keys

### Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project or select existing one
3. Go to Settings > API
4. Copy the Project URL and API keys

### Google AI (Gemini)
1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API key in Google AI Studio"
3. Create a new API key
4. Copy the key

### Replicate (Optional - for image generation)
1. Go to [replicate.com](https://replicate.com)
2. Sign up and go to Account Settings
3. Copy your API token

## Database Setup

1. Run the SQL schema in your Supabase SQL Editor:
   - Open `supabase-schema.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Run the query

2. This will create:
   - All necessary tables (users, products, projects, generations)
   - Indexes for performance
   - RLS policies for security
   - Helper functions (deduct_credits)

## Verification

After setting up, verify your configuration:

```bash
npm run dev
```

Then test the API:

```bash
curl http://localhost:3000/api/visualize/status?user_id=test-user-id
```

You should see a response with API status and credits information.


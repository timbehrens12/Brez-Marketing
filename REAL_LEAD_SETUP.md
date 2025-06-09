# Real Lead Generation Setup

## 🎯 What This Fixes

The old system generated **fake business data** - fake phone numbers, fake emails, fake social media. 

The new system finds **REAL businesses** with actual contact information or marks fields as "N/A" when data isn't available.

## 🔧 Setup Required

### 1. Get Google Places API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Places API" 
3. Create an API key
4. Add to your environment variables: `GOOGLE_PLACES_API_KEY=your_key_here`

### 2. Update Frontend Toggle

In `app/lead-generator/page.tsx`, find the AI toggle and update the labels to:

```tsx
// Instead of "Use AI Generation (Faster)"
// Use this:

<div className="space-y-4">
  <Label className="text-sm font-medium text-gray-300">Lead Generation Method:</Label>
  <div className="space-y-3">
    <div className="flex items-center space-x-3">
      <Checkbox 
        id="use-real-data" 
        checked={!useAI}
        onCheckedChange={(checked) => setUseAI(!checked)}
      />
      <Label htmlFor="use-real-data" className="text-sm font-medium text-green-400">
        ✅ Real Business Data (Recommended)
      </Label>
    </div>
    <p className="text-xs text-gray-400 ml-6">
      Uses Google Places to find actual businesses with real phone numbers, addresses, and websites. 
      Shows "N/A" for data that cannot be found.
    </p>
    
    <div className="flex items-center space-x-3">
      <Checkbox 
        id="use-ai" 
        checked={useAI}
        onCheckedChange={setUseAI}
      />
      <Label htmlFor="use-ai" className="text-sm font-medium text-orange-400">
        🤖 AI Generated Data (Fast but Fake)
      </Label>
    </div>
    <p className="text-xs text-gray-400 ml-6">
      AI creates fictional business data for testing purposes. Not recommended for real outreach.
    </p>
  </div>
</div>
```

## 🚀 How It Works Now

### Real Data Mode (Recommended):
- ✅ **Business Names**: Real business names from Google Places
- ✅ **Phone Numbers**: Actual phone numbers or "N/A"
- ✅ **Addresses**: Real street addresses
- ✅ **Websites**: Real websites or "N/A" 
- ✅ **Ratings/Reviews**: Real Google ratings and review counts
- ⚠️ **Emails**: "N/A" (requires additional email finder API)
- ⚠️ **Owner Names**: "N/A" (requires additional business owner lookup)
- ⚠️ **Social Media**: "N/A" (requires additional social media APIs)

### Lead Scoring (Based on Real Factors):
- Base score: 50
- +15 points: Has website
- +10 points: Has phone number
- +10 points: Rating 4.0+
- +5 points: Has 10+ reviews
- +5 points: Has 50+ reviews  
- +5 points: Currently open

### AI Insights (Based on Real Data):
- "No website - major digital presence opportunity"
- "Low rating - reputation management needed"
- "Few reviews - review generation campaign needed"
- "Strong review presence - good social proof"

## 💰 Cost Considerations

- Google Places API: ~$17 per 1000 searches
- For 20 leads: ~$0.35 per search
- Much cheaper than fake data is worthless

## 🔮 Future Enhancements

To get even better data, you could add:

1. **Hunter.io API** - Find real email addresses ($49/month)
2. **Apollo.io API** - Business contact information ($49/month)  
3. **LinkedIn Sales Navigator API** - Owner/employee information
4. **Social media scrapers** - Find Instagram/Facebook handles

## 🧪 Testing

Test with HVAC businesses in Spring, TX to see the difference:
- Real businesses like "ABC Air Conditioning & Heating"
- Real phone numbers like "(281) 555-0123"
- Real addresses like "123 Spring Cypress Rd, Spring, TX 77373"
- Real websites or "N/A" when they don't have one

This gives you actionable leads instead of waste of time fake data! 
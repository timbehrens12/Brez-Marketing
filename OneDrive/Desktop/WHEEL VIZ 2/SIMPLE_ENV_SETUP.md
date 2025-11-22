# 🚀 Super Simple Setup (No Database)

## Step 1: Create `.env.local` File

In your project root (same folder as `package.json`), create a file called `.env.local`:

```
WHEEL VIZ 2/
├── .env.local          ← CREATE THIS FILE HERE
├── package.json
├── app/
└── components/
```

## Step 2: Add This ONE Line

Open `.env.local` and add:

```env
GOOGLE_AI_API_KEY=your-key-here
```

## Step 3: Get Your Google AI Key

1. Go to https://ai.google.dev
2. Click "Get API key in Google AI Studio"
3. Click "Create API Key"
4. Copy the key
5. Paste it in `.env.local` (replace `your-key-here`)

Example:
```env
GOOGLE_AI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Test It!

```bash
# Start server
npm run dev

# Open browser
http://localhost:3000/api/test-visualize
```

You should see:
```json
{
  "status": "ok",
  "message": "Test endpoint ready - no database required!"
}
```

## Step 5: Test the AI

Open browser console (F12) and paste:

```javascript
fetch('/api/test-visualize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
    vehicle_string: '2020 Ford F-150 XLT',
    product: {
      name: 'BC Racing Coilovers',
      type: 'suspension',
      specs: {
        frontLowering: '2.0"',
        rearLowering: '2.0"'
      }
    }
  })
})
.then(r => r.json())
.then(data => console.log('✅ Result:', data));
```

Check the console - you should see the AI's response!

---

## That's It! 🎉

No Supabase, no database, no complicated setup.

Just **ONE environment variable** and you're testing the AI!

---

## Optional: Add Test Button to UI

See `TEST_WITHOUT_DATABASE.md` for instructions on adding a test button to your sidebar.

---

## Later: Add Database for Production

When you're ready for user accounts, credits, and history:
1. See `ENV_SETUP.md` for full Supabase setup
2. Use `/api/visualize` instead of `/api/test-visualize`


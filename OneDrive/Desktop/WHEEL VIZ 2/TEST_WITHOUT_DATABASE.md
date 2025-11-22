# 🧪 Testing Without Database

You're right - for testing the AI functionality, you don't need Supabase!

This guide shows how to test the core AI pipeline directly.

---

## 🎯 What You Need (Minimal)

### 1. Just ONE Environment Variable

Create `.env.local` in project root:

```env
# Only this one is required for testing!
GOOGLE_AI_API_KEY=your-google-ai-key-here
```

**Get the key:**
1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API key"
3. Copy and paste above

That's it! No Supabase needed for testing.

---

## 🚀 Quick Test (3 Steps)

### Step 1: Start Server

```bash
npm run dev
```

### Step 2: Test the Endpoint

Open your browser and go to:
```
http://localhost:3000/api/test-visualize
```

You should see:
```json
{
  "status": "ok",
  "message": "Test endpoint ready - no database required!"
}
```

### Step 3: Test with Real Data

Open browser console (F12) and paste:

```javascript
fetch('/api/test-visualize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
    vehicle_string: '2020 Ford F-150 XLT',
    product: {
      name: 'BC Racing BR Coilovers',
      type: 'suspension',
      specs: {
        frontLowering: '1.0-3.0"',
        rearLowering: '1.0-3.0"',
        springRate: '10K/8K'
      }
    }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Success!', data);
  console.log('📋 Mechanic Instructions:', data.debug.mechanic_instructions);
  console.log('🖼️ Generated Image:', data.generated_image_url);
});
```

---

## 🎨 Test Different Products

### Test Wheels (Visible Item)

```javascript
fetch('/api/test-visualize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
    vehicle_string: '2020 Ford F-150 XLT',
    product: {
      name: 'Anovia Kinetic Wheels',
      type: 'wheel',
      specs: {
        diameter: 20,
        width: 10,
        offset: 35,
        finish: 'Gloss Black',
        boltPattern: '5x114.3'
      },
      image_url: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Wheel'
    }
  })
})
.then(r => r.json())
.then(console.log);
```

**Expected:** `should_use_reference_image: true` (wheels are visible!)

---

### Test Suspension (Invisible Item)

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
.then(console.log);
```

**Expected:** `should_use_reference_image: false` (suspension is invisible!)

---

### Test Tires

```javascript
fetch('/api/test-visualize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
    vehicle_string: '2020 Ford F-150 XLT',
    product: {
      name: 'Nitto Ridge Grappler',
      type: 'tire',
      specs: {
        width: 275,
        aspectRatio: 55,
        diameter: 20
      },
      image_url: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Tire'
    }
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 🎯 Add Test Button to UI

Create `components/TestAIButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export const TestAIButton = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testSuspension = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
          vehicle_string: '2020 Ford F-150 XLT',
          product: {
            name: 'BC Racing BR Coilovers',
            type: 'suspension',
            specs: {
              frontLowering: '2.0"',
              rearLowering: '2.0"'
            }
          }
        })
      });

      const data = await response.json();
      setResult(data);
      console.log('✅ Test Result:', data);
      alert('Check console for results!');
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('Test failed - check console');
    } finally {
      setLoading(false);
    }
  };

  const testWheels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
          vehicle_string: '2020 Ford F-150 XLT',
          product: {
            name: 'Anovia Kinetic',
            type: 'wheel',
            specs: {
              diameter: 20,
              width: 10,
              offset: 35,
              finish: 'Gloss Black'
            },
            image_url: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Wheel'
          }
        })
      });

      const data = await response.json();
      setResult(data);
      console.log('✅ Test Result:', data);
      alert('Check console for results!');
    } catch (error) {
      console.error('❌ Test failed:', error);
      alert('Test failed - check console');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 p-4 bg-white/5 rounded-lg border border-white/10">
      <h3 className="text-sm font-bold text-white">🧪 AI Testing (No Database)</h3>
      <div className="flex gap-2">
        <Button
          onClick={testSuspension}
          disabled={loading}
          className="flex-1 bg-purple-500 hover:bg-purple-600"
          size="sm"
        >
          {loading ? '⏳' : '🔧'} Test Suspension
        </Button>
        <Button
          onClick={testWheels}
          disabled={loading}
          className="flex-1 bg-green-500 hover:bg-green-600"
          size="sm"
        >
          {loading ? '⏳' : '⭕'} Test Wheels
        </Button>
      </div>
      {result && (
        <div className="text-xs text-white/60 mt-2">
          <div>✅ Success: {result.success ? 'Yes' : 'No'}</div>
          <div>📋 Check console for details</div>
        </div>
      )}
    </div>
  );
};
```

Add to your sidebar:

```typescript
// In components/sidebar/Sidebar.tsx
import { TestAIButton } from '@/components/TestAIButton';

// Add at the top of sidebar content:
<TestAIButton />
```

---

## 📊 What You'll See

When you test, check the **browser console** and **terminal**:

### Browser Console:
```javascript
✅ Success! {
  success: true,
  generated_image_url: "...",
  debug: {
    mechanic_instructions: {
      visual_prompt: "Raise the vehicle's ride height by exactly 2 inches...",
      negative_prompt: "tilted vehicle, uneven stance...",
      mask_strategy: {
        target_area: "ground_clearance",
        precision_level: "high",
        reference_points: ["rocker_panel", "wheel_well_gap"]
      },
      should_use_reference_image: false
    }
  }
}
```

### Terminal (Server):
```
🧪 TEST MODE - Bypassing database
📦 Product: BC Racing BR Coilovers
🚗 Vehicle: 2020 Ford F-150 XLT
🔧 Calling Virtual Mechanic...
✅ Mechanic Instructions Generated:
   - Should use reference: false
   - Target area: ground_clearance
   - Precision: high
🎨 Calling Precision Renderer...
✅ Image Generated: [url]
```

---

## 🎯 What This Tests

✅ **Virtual Mechanic** - Generates instructions from specs  
✅ **Product Type Detection** - Knows visible vs invisible  
✅ **Reference Image Logic** - Uses image only for visible items  
✅ **Specification Parsing** - Converts "2.0\"" to 2 inches  
✅ **Prompt Engineering** - Creates detailed visual instructions  
✅ **Renderer Pipeline** - Processes the request  

❌ **NOT Tested** (because no database):
- Credit verification
- Product fetching from database
- Generation history
- User management

---

## 🔧 Why This is Better for Testing

### Old Way (with database):
```
1. Set up Supabase ⏱️ 10 min
2. Run SQL schema ⏱️ 5 min
3. Create test data ⏱️ 5 min
4. Configure env vars ⏱️ 5 min
5. Test API ⏱️ 1 min
Total: 26 minutes
```

### New Way (no database):
```
1. Add Google AI key ⏱️ 2 min
2. Test API ⏱️ 1 min
Total: 3 minutes
```

**23 minutes saved!** ⚡

---

## 🚀 When to Use Each Endpoint

### Use `/api/test-visualize` (No Database) For:
- ✅ Testing AI logic
- ✅ Testing prompt engineering
- ✅ Testing different product types
- ✅ Quick iterations
- ✅ Development

### Use `/api/visualize` (With Database) For:
- ✅ Production
- ✅ Credit management
- ✅ User accounts
- ✅ Generation history
- ✅ Real product catalog

---

## 💡 Pro Tip: Use Your Real Product Data

You can test with products from your selectors:

```typescript
// From WheelSelector.tsx
const FITMENT_WHEELS = [
  {
    id: 'w1',
    brand: 'Anovia',
    model: 'Kinetic',
    diameter: 18,
    width: 9.5,
    offset: 35,
    // ...
  }
];

// Test with this data:
fetch('/api/test-visualize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    base_image_url: 'https://placehold.co/800x600/333/fff?text=My+Truck',
    vehicle_string: '2020 Ford F-150 XLT',
    product: {
      name: `${FITMENT_WHEELS[0].brand} ${FITMENT_WHEELS[0].model}`,
      type: 'wheel',
      specs: {
        diameter: FITMENT_WHEELS[0].diameter,
        width: FITMENT_WHEELS[0].width,
        offset: FITMENT_WHEELS[0].offset
      }
    }
  })
});
```

---

## ✅ Minimal Setup Checklist

- [ ] Create `.env.local` with `GOOGLE_AI_API_KEY`
- [ ] Run `npm run dev`
- [ ] Visit `http://localhost:3000/api/test-visualize`
- [ ] See "status: ok"
- [ ] Test with browser console or UI button
- [ ] Check terminal for AI output

**That's it! No database needed.** 🎉

---

## 🔄 Later: Add Database for Production

When you're ready for production features:
1. Add Supabase keys to `.env.local`
2. Run database schema
3. Switch from `/api/test-visualize` to `/api/visualize`
4. Get credit management, user accounts, history, etc.

But for now, test away without it! 🚀


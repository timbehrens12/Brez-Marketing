# 🚀 Quick Start Guide - Wheel Viz 2 Backend

## ⚡ 5-Minute Setup

### Step 1: Install Dependencies ✅ DONE
```bash
npm install @google/generative-ai
```

### Step 2: Set Environment Variables

Create `.env.local` in root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_AI_API_KEY=your_google_ai_key
```

**Get Keys:**
- Supabase: https://supabase.com → Project Settings → API
- Google AI: https://ai.google.dev → Get API Key

### Step 3: Set Up Database

1. Open Supabase SQL Editor
2. Copy contents of `supabase-schema.sql`
3. Paste and run
4. Verify tables created: users, products, projects, generations

### Step 4: Test API

```bash
npm run dev
```

```bash
curl http://localhost:3000/api/visualize/status?user_id=test
```

## 📁 Files Created

### Backend Core
- ✅ `lib/ai/mechanic.ts` - Virtual Mechanic (prompt engineering)
- ✅ `lib/ai/renderer.ts` - Precision Renderer (image generation)
- ✅ `app/api/visualize/route.ts` - Main API endpoint

### Database
- ✅ `types/supabase.ts` - TypeScript definitions
- ✅ `supabase-schema.sql` - Database schema

### Frontend Integration
- ✅ `lib/api/visualize.ts` - API client

### Documentation
- ✅ `README_BACKEND.md` - Full architecture docs
- ✅ `ENV_SETUP.md` - Environment setup
- ✅ `INTEGRATION_GUIDE.md` - Frontend integration
- ✅ `BACKEND_IMPLEMENTATION_SUMMARY.md` - Complete overview
- ✅ `QUICK_START.md` - This file

## 🎯 API Usage

### Generate Visualization

```typescript
import { generateVisualization } from '@/lib/api/visualize';

const result = await generateVisualization({
  user_id: 'user-123',
  product_id: 'product-456',
  base_image_url: 'https://example.com/car.jpg',
  vehicle_string: '2020 Ford F-150 XLT'
});

if (result.success) {
  console.log('Image:', result.generated_image_url);
  console.log('Credits:', result.credits_remaining);
}
```

### Check Status

```typescript
import { checkVisualizationStatus } from '@/lib/api/visualize';

const status = await checkVisualizationStatus('user-123');
console.log('Credits:', status.credits_remaining);
```

## ⚠️ Important

### Image Generation Service Required

The renderer needs an actual image generation service. Current placeholder returns original image.

**Integrate one of:**
- Google Imagen (recommended)
- Stability AI (Stable Diffusion)
- Replicate
- OpenAI DALL-E

**Where:** `lib/ai/renderer.ts` → `processImageGeneration()` function

## 🔄 Complete Flow

```
1. User uploads image → currentImage
2. User enters vehicle → vehicleString
3. User selects product → selectedProduct
4. User clicks Generate → API call
5. API verifies credits → Deduct 1 credit
6. Virtual Mechanic → Generate instructions
7. Precision Renderer → Generate image
8. Return result → Update UI
```

## 📊 Database Tables

- **users** - User accounts, credits, subscription
- **products** - Product catalog (wheels, tires, etc.)
- **projects** - User visualization sessions
- **generations** - Generation history

## 🎨 Frontend Integration

### Add to GenerateButton:

```typescript
import { generateVisualization } from '@/lib/api/visualize';
import { useStore } from '@/store/useStore';

const handleGenerate = async () => {
  const { currentImage, selectedProduct, userId, vehicleString } = useStore.getState();
  
  const result = await generateVisualization({
    user_id: userId || 'demo-user',
    product_id: selectedProduct.id,
    base_image_url: currentImage,
    vehicle_string: vehicleString || '2020 Ford F-150 XLT'
  });
  
  if (result.success) {
    useStore.getState().setCurrentImage(result.generated_image_url);
  }
};
```

## 🧪 Testing Checklist

- [ ] Environment variables set
- [ ] Database schema created
- [ ] API status endpoint responds
- [ ] Can fetch product details
- [ ] Credit system works
- [ ] Generation endpoint accepts requests
- [ ] Frontend can call API

## 📚 Read Next

1. `BACKEND_IMPLEMENTATION_SUMMARY.md` - Complete overview
2. `README_BACKEND.md` - Architecture details
3. `INTEGRATION_GUIDE.md` - Frontend integration
4. `ENV_SETUP.md` - Detailed setup

## 🆘 Troubleshooting

**API returns 500:**
- Check environment variables
- Verify Supabase connection
- Check console logs

**Credits not deducting:**
- Verify `deduct_credits` function exists in Supabase
- Check RLS policies
- Use service role key

**Images not generating:**
- Normal! Need to integrate image generation service
- See `lib/ai/renderer.ts` → `processImageGeneration()`

## ✅ Success Criteria

You're ready when:
1. ✅ API status endpoint works
2. ✅ Database tables created
3. ✅ Environment variables set
4. ✅ No linting errors
5. ✅ Frontend can import API client

## 🎉 You're All Set!

Backend is complete. Next steps:
1. Integrate image generation service
2. Connect frontend to API
3. Add user authentication
4. Test end-to-end flow

---

**Need Help?** Check the detailed guides in the documentation files.


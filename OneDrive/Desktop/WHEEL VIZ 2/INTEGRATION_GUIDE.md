# Frontend Integration Guide

This guide shows how to integrate the backend visualization API with your existing frontend components.

## 🎯 Quick Start

### 1. Import the API Client

```typescript
import { generateVisualization, checkVisualizationStatus } from '@/lib/api/visualize';
```

### 2. Update Your Generate Button

Modify `components/ui/GenerateButton.tsx` to call the API:

```typescript
import { generateVisualization } from '@/lib/api/visualize';
import { useStore } from '@/store/useStore';

export const GenerateButton = () => {
  const { 
    currentImage, 
    selectedProduct, 
    setCurrentImage, 
    setIsGenerating 
  } = useStore();

  const handleGenerate = async () => {
    if (!currentImage || !selectedProduct) {
      alert('Please upload an image and select a product');
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateVisualization({
        user_id: 'demo-user-id', // TODO: Replace with actual user ID from auth
        product_id: selectedProduct.id,
        base_image_url: currentImage,
        vehicle_string: '2020 Ford F-150 XLT', // TODO: Get from user input
      });

      if (result.success && result.generated_image_url) {
        setCurrentImage(result.generated_image_url);
        alert(`Success! ${result.credits_remaining} credits remaining`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate visualization');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button onClick={handleGenerate}>
      Generate
    </button>
  );
};
```

## 📦 Store Updates

Update your Zustand store (`store/useStore.ts`) to include user and credits:

```typescript
interface StoreState {
  // ... existing state ...
  userId: string | null;
  userCredits: number;
  vehicleString: string;
  
  // Actions
  setUserId: (id: string) => void;
  setUserCredits: (credits: number) => void;
  setVehicleString: (vehicle: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  // ... existing state ...
  userId: null,
  userCredits: 0,
  vehicleString: '',
  
  setUserId: (id) => set({ userId: id }),
  setUserCredits: (credits) => set({ userCredits: credits }),
  setVehicleString: (vehicle) => set({ vehicleString: vehicle }),
}));
```

## 🔐 User Authentication

### Option 1: Supabase Auth (Recommended)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// In your auth component
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  useStore.getState().setUserId(user.id);
}
```

### Option 2: Demo Mode (For Testing)

```typescript
// Use a demo user ID for testing
const DEMO_USER_ID = 'demo-user-123';
useStore.getState().setUserId(DEMO_USER_ID);
```

## 🎨 UI Components to Add

### 1. Vehicle Input Component

Add a component to capture vehicle information:

```typescript
// components/VehicleInput.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

export const VehicleInput = () => {
  const { vehicleString, setVehicleString } = useStore();
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');

  const handleSave = () => {
    const vehicle = `${year} ${make} ${model} ${trim}`.trim();
    setVehicleString(vehicle);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-white">Vehicle Information</h3>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} />
        <Input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} />
        <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
        <Input placeholder="Trim" value={trim} onChange={(e) => setTrim(e.target.value)} />
      </div>
      <Button onClick={handleSave} className="w-full">Save Vehicle Info</Button>
      {vehicleString && (
        <p className="text-xs text-white/60">Current: {vehicleString}</p>
      )}
    </div>
  );
};
```

### 2. Credits Display Component

Show user's remaining credits:

```typescript
// components/CreditsDisplay.tsx
'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { checkVisualizationStatus } from '@/lib/api/visualize';
import { Coins } from 'lucide-react';

export const CreditsDisplay = () => {
  const { userId, userCredits, setUserCredits } = useStore();

  useEffect(() => {
    if (userId) {
      checkVisualizationStatus(userId).then((result) => {
        if (result.success) {
          setUserCredits(result.credits_remaining);
        }
      });
    }
  }, [userId, setUserCredits]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
      <Coins className="w-4 h-4 text-[#CCFF00]" />
      <span className="text-sm font-bold text-white">{userCredits} Credits</span>
    </div>
  );
};
```

## 🔄 Complete Flow

1. **User uploads vehicle image** → Store in `currentImage`
2. **User enters vehicle info** → Store in `vehicleString`
3. **User selects product** → Store in `selectedProduct`
4. **User clicks Generate** → Call `generateVisualization()`
5. **API processes request** → Returns generated image
6. **Update UI** → Display new image, update credits

## 📍 Where to Add Components

### In Sidebar (`components/sidebar/Sidebar.tsx`):

```typescript
import { VehicleInput } from '@/components/VehicleInput';
import { CreditsDisplay } from '@/components/CreditsDisplay';

// Add near the top of the sidebar
<div className="p-4 space-y-4">
  <CreditsDisplay />
  <VehicleInput />
</div>
```

## 🧪 Testing

### 1. Test API Status

```typescript
import { checkVisualizationStatus } from '@/lib/api/visualize';

const testStatus = async () => {
  const result = await checkVisualizationStatus('demo-user-123');
  console.log('API Status:', result);
};
```

### 2. Test Generation (Mock)

```typescript
import { generateVisualization } from '@/lib/api/visualize';

const testGeneration = async () => {
  const result = await generateVisualization({
    user_id: 'demo-user-123',
    product_id: 'test-product',
    base_image_url: 'https://example.com/car.jpg',
    vehicle_string: '2020 Ford F-150 XLT'
  });
  console.log('Generation Result:', result);
};
```

## ⚠️ Important Notes

1. **User Authentication**: Implement proper user authentication before production
2. **Image Upload**: Ensure uploaded images are stored (Supabase Storage, S3, etc.)
3. **Error Handling**: Add proper error states and user feedback
4. **Loading States**: Show progress during generation (can take 10-30 seconds)
5. **Credits System**: Implement credit purchase flow
6. **Rate Limiting**: Consider adding rate limiting for API calls

## 🚀 Next Steps

1. Set up Supabase authentication
2. Implement image upload to cloud storage
3. Add vehicle input form
4. Update GenerateButton to use API
5. Add credits display
6. Test end-to-end flow
7. Add error handling and loading states

## 📚 Related Files

- `lib/api/visualize.ts` - API client
- `app/api/visualize/route.ts` - API endpoint
- `lib/ai/mechanic.ts` - Virtual Mechanic
- `lib/ai/renderer.ts` - Precision Renderer
- `README_BACKEND.md` - Backend architecture
- `ENV_SETUP.md` - Environment setup


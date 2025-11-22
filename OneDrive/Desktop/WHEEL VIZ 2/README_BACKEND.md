# Wheel Viz 2 - Backend Architecture

## 🎯 Overview

This document describes the **2-Step Verification Pipeline** for engineering-accurate vehicle visualization.

## 🏗️ Architecture

```
User Request → API Route → Virtual Mechanic → Precision Renderer → Generated Image
                  ↓              ↓                    ↓
            Credit Check    Prompt Engineering    Image Generation
```

## 📁 File Structure

```
lib/
├── ai/
│   ├── mechanic.ts    # Virtual Mechanic Layer (Prompt Engineering)
│   └── renderer.ts    # Precision Renderer Layer (Image Generation)
app/
├── api/
│   └── visualize/
│       └── route.ts   # Main API endpoint
types/
└── supabase.ts        # Database type definitions
```

## 🔧 Virtual Mechanic Layer

**File:** `lib/ai/mechanic.ts`

**Purpose:** Translates product specifications into precise visual instructions.

**Model:** `gemini-1.5-pro`

**Input:**
```typescript
{
  product_json: {
    id: string;
    name: string;
    type: 'wheel' | 'tire' | 'suspension' | 'spacer' | 'accessory';
    meta_specs: Record<string, any>;
    image_url?: string;
  };
  vehicle_string: string; // e.g., "2020 Ford F-150 XLT"
}
```

**Output:**
```typescript
{
  visual_prompt: string;           // Detailed visual instructions
  negative_prompt: string;         // What to avoid
  mask_strategy: {
    target_area: string;           // e.g., "wheels", "ground_clearance"
    precision_level: 'high' | 'medium' | 'low';
    reference_points: string[];    // e.g., ["wheel_well", "rocker_panel"]
  };
  should_use_reference_image: boolean; // TRUE for visible items only
}
```

**Key Features:**
- Engineering accuracy (3-inch lift = exactly 3 inches visually)
- Product-type-specific handling
- Automatic fallback for simple cases
- Smart reference image detection (only for visible items)

## 🎨 Precision Renderer Layer

**File:** `lib/ai/renderer.ts`

**Purpose:** Executes pixel changes using strict masking.

**Model:** `gemini-1.5-pro` (with vision capabilities)

**Input:**
```typescript
{
  base_image_url: string;              // User's vehicle image
  mechanic_instructions: MechanicOutput;
  reference_image_url?: string;        // Product image (only if should_use_reference_image = true)
  mask_image_url?: string;             // Optional user-provided mask
}
```

**Output:**
```typescript
{
  generated_image_url: string;
  generation_metadata: {
    model: string;
    timestamp: string;
    prompt_used: string;
    settings: {
      reference_image_weight: number;  // 0.85 for visible items, 0 otherwise
      mask_mode: 'user_provided';
      precision_level: string;
    };
  };
}
```

**Key Features:**
- Inpainting with user-provided masks
- Reference image weight: 0.85 for visible items
- Automatic mask generation (optional)
- High-resolution output

## 🌐 API Endpoint

**File:** `app/api/visualize/route.ts`

**Endpoint:** `POST /api/visualize`

**Request:**
```typescript
{
  user_id: string;
  product_id: string;
  base_image_url: string;
  vehicle_string: string;
  mask_image_url?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  generated_image_url?: string;
  credits_remaining?: number;
  error?: string;
  metadata?: {
    mechanic_instructions: any;
    generation_metadata: any;
  };
}
```

**Pipeline Steps:**

1. **Credit Verification**
   - Check user has sufficient credits
   - Return 402 if insufficient

2. **Fetch Product Details**
   - Query Supabase for product specs
   - Return 404 if not found

3. **Virtual Mechanic**
   - Generate precise visual instructions
   - Determine if reference image should be used

4. **Precision Renderer**
   - Generate modified image
   - Apply masking and reference image guidance

5. **Finalization**
   - Deduct credits
   - Save generation record
   - Return generated image URL

## 🗄️ Database Schema

**Tables:**
- `users` - User accounts and credits
- `products` - Product catalog with meta_specs (JSONB)
- `projects` - User visualization projects
- `generations` - Individual generation records

**Key Fields:**
- `products.meta_specs` - Flexible JSONB for product specifications
- `products.type` - Product category (wheel, tire, suspension, spacer, accessory)
- `users.credits` - Available generation credits
- `generations.mechanic_instructions` - Stored Virtual Mechanic output
- `generations.generation_metadata` - Stored Renderer output

## 🔐 Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Products are publicly readable
- Service role key for server-side operations
- Atomic credit deduction to prevent race conditions

## 🚀 Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install @google/generative-ai
   ```

2. **Set Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your API keys (see `ENV_SETUP.md`)

3. **Set Up Database**
   - Run `supabase-schema.sql` in Supabase SQL Editor
   - Verify tables and functions are created

4. **Test API**
   ```bash
   curl -X POST http://localhost:3000/api/visualize \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test-user-id",
       "product_id": "test-product-id",
       "base_image_url": "https://example.com/car.jpg",
       "vehicle_string": "2020 Ford F-150 XLT"
     }'
   ```

## 📝 Important Notes

### Image Generation Service

The current implementation uses Gemini for prompt engineering but **requires integration with an actual image generation service** for the Renderer layer.

**Recommended Services:**
1. **Google Imagen** (preferred for Gemini ecosystem)
2. **Stability AI** (Stable Diffusion with inpainting)
3. **Replicate** (easy API access to SD models)
4. **OpenAI DALL-E** (high quality, limited inpainting)

**Integration Point:** `lib/ai/renderer.ts` → `processImageGeneration()` function

### Reference Image Usage

**CRITICAL CONSTRAINT:**
- `reference_image_url` should **ONLY** be passed for visible items
- ✅ Wheels, Tires, some Accessories
- ❌ Lift Kits, Suspension, Spacers (mostly invisible)

This is automatically handled by `should_use_reference_image` flag from Virtual Mechanic.

### Engineering Accuracy

The system is designed for **pixel-perfect accuracy**:
- 3-inch lift = exactly 3 inches in the visual
- 20x10 wheel = exactly 20" diameter, 10" wide
- 25mm spacer = exactly 25mm offset change

This is achieved through:
1. Precise prompt engineering in Virtual Mechanic
2. Strict masking in Renderer
3. Reference point tracking
4. High precision level settings

## 🔄 Future Enhancements

1. **Batch Processing** - Multiple products in one generation
2. **Advanced Masking** - AI-powered mask generation
3. **Style Transfer** - Match lighting/environment
4. **3D Integration** - Use 3D models for perfect accuracy
5. **Real-time Preview** - Low-res preview before full generation
6. **Credit Packages** - Subscription tiers and bulk purchases

## 📞 Support

For questions or issues:
1. Check `ENV_SETUP.md` for configuration help
2. Review `supabase-schema.sql` for database structure
3. Examine console logs for debugging information

---

**Built with:** Next.js 15, Supabase, Google Gemini AI, TypeScript


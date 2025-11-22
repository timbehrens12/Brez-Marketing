# 📂 Wheel Viz 2 - Complete Project Structure

## 🎯 Overview

This document shows the complete file structure with descriptions of each component.

```
WHEEL VIZ 2/
│
├── 📱 FRONTEND
│   ├── app/                          # Next.js 15 App Router
│   │   ├── page.tsx                  # Main page (Canvas + Sidebar)
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Global styles (Fitment theme)
│   │   └── api/                      # API Routes
│   │       └── visualize/
│   │           └── route.ts          # ⭐ Main API endpoint
│   │
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx            # 3D visualization canvas
│   │   │   └── LoadingOverlay.tsx    # Loading state overlay
│   │   │
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx           # Main sidebar container
│   │   │   ├── WheelSelector.tsx     # Wheel product selector
│   │   │   ├── TireSelector.tsx      # Tire product selector
│   │   │   ├── SuspensionSelector.tsx # Suspension product selector
│   │   │   ├── SpacerSelector.tsx    # Spacer product selector
│   │   │   ├── AccessorySelector.tsx # Accessory product selector
│   │   │   ├── StanceControls.tsx    # Manual stance adjustments
│   │   │   └── ReferenceGrid.tsx     # Reference grid overlay
│   │   │
│   │   └── ui/                       # Reusable UI components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── GenerateButton.tsx    # Main generate button
│   │       └── ... (other UI components)
│   │
│   └── store/
│       └── useStore.ts               # Zustand global state
│
├── 🧠 BACKEND (NEW)
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── mechanic.ts           # ⭐ Virtual Mechanic Layer
│   │   │   └── renderer.ts           # ⭐ Precision Renderer Layer
│   │   │
│   │   └── api/
│   │       └── visualize.ts          # ⭐ Frontend API client
│   │
│   └── types/
│       └── supabase.ts               # ⭐ Database type definitions
│
├── 🗄️ DATABASE
│   └── supabase-schema.sql           # ⭐ Complete database schema
│
├── 📚 DOCUMENTATION (NEW)
│   ├── README_BACKEND.md             # ⭐ Architecture documentation
│   ├── ENV_SETUP.md                  # ⭐ Environment setup guide
│   ├── INTEGRATION_GUIDE.md          # ⭐ Frontend integration guide
│   ├── BACKEND_IMPLEMENTATION_SUMMARY.md # ⭐ Complete overview
│   ├── QUICK_START.md                # ⭐ Quick start guide
│   ├── PROJECT_STRUCTURE.md          # ⭐ This file
│   └── README.md                     # Original README
│
├── ⚙️ CONFIGURATION
│   ├── package.json                  # Dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── next.config.ts                # Next.js config
│   ├── tailwind.config.js            # Tailwind config
│   ├── components.json               # shadcn/ui config
│   └── .env.local                    # Environment variables (create this)
│
└── 🎨 ASSETS
    └── public/
        └── file.svg                  # Static assets
```

## 🎯 Key Files Explained

### Backend Core (NEW)

#### `lib/ai/mechanic.ts` ⭐
**Virtual Mechanic Layer**
- Translates product specs → visual instructions
- Uses Gemini 1.5 Pro
- Handles 5 product types
- Smart reference image detection
- Engineering-accurate parsing

#### `lib/ai/renderer.ts` ⭐
**Precision Renderer Layer**
- Executes pixel changes
- Inpainting with masking
- Reference image guidance (0.85 weight)
- High-resolution output
- Auto-mask generation

#### `app/api/visualize/route.ts` ⭐
**Main API Endpoint**
- POST `/api/visualize` - Generate
- GET `/api/visualize/status` - Check credits
- Credit verification
- Product fetching
- Generation pipeline orchestration

#### `lib/api/visualize.ts` ⭐
**Frontend API Client**
- Type-safe API calls
- Error handling
- Easy integration with components

### Database

#### `supabase-schema.sql` ⭐
**Complete Database Schema**
- Tables: users, products, projects, generations
- RLS policies for security
- Helper functions (deduct_credits)
- Indexes for performance
- Triggers for timestamps

#### `types/supabase.ts` ⭐
**TypeScript Definitions**
- Type-safe database queries
- Auto-completion in IDE
- Enum types

### Documentation

#### `README_BACKEND.md` ⭐
- Complete architecture overview
- API specifications
- Security details
- Setup instructions

#### `INTEGRATION_GUIDE.md` ⭐
- Step-by-step frontend integration
- Component examples
- Store updates
- Testing procedures

#### `QUICK_START.md` ⭐
- 5-minute setup guide
- Quick reference
- Common commands

### Frontend (Existing)

#### `app/page.tsx`
**Main Page**
- Canvas on left
- Sidebar on right
- Camera controls
- Before/after toggle

#### `components/sidebar/Sidebar.tsx`
**Sidebar Container**
- Category tabs (Wheels, Tires, etc.)
- Product selectors
- Cart icon with credits display
- Collapsible design

#### `components/sidebar/*Selector.tsx`
**Product Selectors**
- Real Fitment Industries data
- Search, filter, sort
- Star ratings and reviews
- Clickable cards
- Details links to Fitment Industries

#### `components/ui/GenerateButton.tsx`
**Generate Button**
- Triggers visualization generation
- **TODO:** Connect to `/api/visualize`

#### `store/useStore.ts`
**Global State**
- Current image
- Selected products
- Cart items
- Generation history
- **TODO:** Add userId, credits, vehicleString

## 🔄 Data Flow

### Current Frontend Flow
```
1. User uploads image → useStore.currentImage
2. User selects product → useStore.selectedProduct
3. User clicks Generate → (currently mock)
```

### New Backend Flow (To Implement)
```
1. User uploads image → Upload to storage → Get URL
2. User enters vehicle info → useStore.vehicleString
3. User selects product → useStore.selectedProduct
4. User clicks Generate → Call /api/visualize
   ├─ Verify credits
   ├─ Fetch product details
   ├─ Virtual Mechanic → Generate instructions
   ├─ Precision Renderer → Generate image
   └─ Return result
5. Update UI with generated image
6. Update credits display
```

## 📊 Database Schema

### Tables

#### `users`
- id (UUID, PK)
- email (TEXT)
- credits (INTEGER)
- subscription_tier (ENUM)
- created_at, updated_at

#### `products`
- id (UUID, PK)
- name (TEXT)
- brand (TEXT)
- type (ENUM: wheel, tire, suspension, spacer, accessory)
- meta_specs (JSONB) ← Flexible specs
- image_url (TEXT)
- price (NUMERIC)
- rating (NUMERIC)
- reviews (INTEGER)
- product_url (TEXT)
- created_at, updated_at

#### `projects`
- id (UUID, PK)
- user_id (UUID, FK)
- vehicle_string (TEXT)
- current_image_url (TEXT)
- original_image_url (TEXT)
- history (JSONB)
- created_at, updated_at

#### `generations`
- id (UUID, PK)
- user_id (UUID, FK)
- product_id (UUID, FK)
- project_id (UUID, FK, nullable)
- base_image_url (TEXT)
- generated_image_url (TEXT)
- vehicle_string (TEXT)
- mechanic_instructions (JSONB)
- generation_metadata (JSONB)
- status (ENUM)
- error_message (TEXT)
- created_at, updated_at

## 🎨 Styling

### Color Scheme (Fitment Industries Theme)
- **Primary:** `#CCFF00` (Neon Green)
- **Secondary:** `#9333EA` (Purple)
- **Background:** `#050505` (Almost Black)
- **Card:** `#0f0f1199` (Dark with transparency)
- **Border:** `#ffffff1a` (White 10% opacity)

### Components
- **shadcn/ui** - Base components
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

## 🔧 Configuration Files

### `package.json`
**Dependencies:**
- Next.js 16.0.3
- React 19.2.0
- Supabase JS 2.84.0
- Google Generative AI (NEW)
- Zustand 5.0.8
- Tailwind CSS 4
- shadcn/ui components

### `next.config.ts`
**Image Domains:**
- wsrv.nl (proxy)
- images.customoffsets.com
- placehold.co
- i.imgur.com

### `.env.local` (Create This)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_AI_API_KEY=
```

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in API keys (see `ENV_SETUP.md`)

3. **Set Up Database**
   - Run `supabase-schema.sql` in Supabase
   - Verify tables created

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Test API**
   ```bash
   curl http://localhost:3000/api/visualize/status?user_id=test
   ```

## 📝 TODO

### Backend
- [ ] Integrate actual image generation service (Imagen, SD, etc.)
- [ ] Add image upload to Supabase Storage
- [ ] Implement user authentication
- [ ] Add rate limiting
- [ ] Set up monitoring/logging

### Frontend
- [ ] Connect GenerateButton to API
- [ ] Add vehicle input component
- [ ] Add credits display
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add generation history view

### Features
- [ ] Credit purchase flow
- [ ] Subscription tiers
- [ ] Save/load projects
- [ ] Share generated images
- [ ] Export high-res images

## 📚 Documentation Index

| File | Purpose | Audience |
|------|---------|----------|
| `QUICK_START.md` | 5-min setup | Developers (first time) |
| `README_BACKEND.md` | Architecture | Developers (detailed) |
| `INTEGRATION_GUIDE.md` | Frontend integration | Frontend devs |
| `ENV_SETUP.md` | Environment setup | DevOps |
| `BACKEND_IMPLEMENTATION_SUMMARY.md` | Complete overview | All |
| `PROJECT_STRUCTURE.md` | This file | All |

## 🎯 Key Concepts

### Engineering Accuracy
Visual changes must match physical specs exactly:
- 3" lift = exactly 3" visually
- 20x10 wheel = exactly 20" diameter, 10" wide
- 25mm spacer = exactly 25mm offset change

### 2-Step Verification
1. **Virtual Mechanic** - Translates specs to instructions
2. **Precision Renderer** - Executes pixel changes

### Smart Reference Images
- Use for visible items (wheels, tires)
- Skip for invisible items (suspension, spacers)
- Automatic detection based on product type

### Credit System
- Users have credits
- Each generation costs 1 credit
- Atomic deduction prevents race conditions
- Subscription tiers for more credits

## 🆘 Need Help?

1. **Setup Issues** → `ENV_SETUP.md`
2. **Architecture Questions** → `README_BACKEND.md`
3. **Integration Help** → `INTEGRATION_GUIDE.md`
4. **Quick Reference** → `QUICK_START.md`
5. **Everything Else** → `BACKEND_IMPLEMENTATION_SUMMARY.md`

---

**Status:** ✅ Backend Complete | 🔄 Frontend Integration Pending

*Last Updated: November 21, 2025*


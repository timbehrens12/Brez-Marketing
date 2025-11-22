# Required Setup Form Implementation

## Overview
The Current Setup Form is now **REQUIRED** and **BLOCKING** after uploading a car photo. Users cannot access the sidebar or generate previews until they complete the form.

## What Changed

### 1. **Store Updates** (`store/useStore.ts`)
- Added `isSetupComplete: boolean` state
- Added `setIsSetupComplete()` action
- Tracks whether user has confirmed their current setup

### 2. **Setup Form** (`components/canvas/CurrentSetupForm.tsx`)
- Added optional `onComplete` callback prop
- Shows "Confirm Setup" button when callback is provided
- Button triggers completion and unlocks the app

### 3. **Canvas Component** (`components/canvas/Canvas.tsx`)
- Form now appears as a **full-screen blocking modal**
- Dark backdrop prevents interaction with canvas
- Auto-shows when image is uploaded and setup is incomplete
- Resets `isSetupComplete` to `false` on new image upload

### 4. **GenerateButton** (`components/ui/GenerateButton.tsx`)
- Added check for `isSetupComplete`
- Alerts user if they try to generate without completing setup
- Extra safety layer beyond UI blocking

### 5. **Sidebar** (`components/sidebar/Sidebar.tsx`)
- Category buttons are **disabled** (grayed out) when `!isSetupComplete`
- Prevents users from selecting products before setup
- Visual feedback (40% opacity, cursor-not-allowed)

## User Flow

### Step-by-Step Experience:
1. **User uploads car photo**
   → Full-screen modal appears with "Setup Required" message
   
2. **Modal blocks everything**
   → Sidebar is grayed out
   → Canvas is dimmed behind modal
   → User must fill form
   
3. **User fills in current specs**
   - Rim diameter (required, defaults to 18")
   - Rim width (optional)
   - Offset (optional)
   - Suspension type (Stock/Lifted/Lowered)
   - Lift/drop height (if applicable)
   
4. **User clicks "Confirm Setup"**
   → Modal disappears
   → Sidebar becomes interactive
   → User can now select products and generate

5. **If user uploads NEW photo**
   → Process repeats (setup form blocks again)

## Visual Design

### Modal Layout:
```
┌─────────────────────────────────────┐
│  Dark Backdrop (80% black blur)    │
│                                     │
│    ┌─────────────────────────┐     │
│    │  Setup Required          │     │
│    │  (Heading)               │     │
│    │                          │     │
│    │  Current Setup Form      │     │
│    │  - Rim Diameter          │     │
│    │  - Rim Width             │     │
│    │  - Offset                │     │
│    │  - Suspension Type       │     │
│    │                          │     │
│    │  [Confirm Setup Button]  │     │
│    └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### Sidebar When Blocked:
- Category buttons: **40% opacity**
- Cursor: **not-allowed**
- No hover effects
- Icons and text grayed out

## Benefits

1. **Ensures Data Quality**: Every generation has context about current setup
2. **Better UX**: Clear onboarding flow, user knows what to do first
3. **More Accurate Results**: AI always receives delta instructions
4. **Prevents Confusion**: Users can't generate with incomplete data
5. **Visual Clarity**: Obvious what needs to be done (modal can't be missed)

## Technical Implementation

### State Management:
```typescript
isSetupComplete: false  // Initially blocked
      ↓
User fills form
      ↓
User clicks "Confirm"
      ↓
setIsSetupComplete(true)  // Unblock app
      ↓
User can select products & generate
      ↓
User uploads new photo
      ↓
setIsSetupComplete(false)  // Re-block for new setup
```

### Blocking Logic:
- **Canvas**: Renders modal overlay when `currentImage && !isSetupComplete`
- **Sidebar**: Checks `!isSetupComplete` to disable buttons
- **GenerateButton**: Validates `isSetupComplete` before API call

## Testing Checklist

- [ ] Upload image → Modal appears
- [ ] Try clicking sidebar → Nothing happens (grayed out)
- [ ] Fill form → Form accepts input
- [ ] Click "Confirm Setup" → Modal disappears
- [ ] Sidebar now interactive → Can select products
- [ ] Click Generate → Works (with delta instructions)
- [ ] Upload new image → Modal appears again
- [ ] Process repeats for new image

## Future Enhancements

- Add "Skip" option with warning (advanced users)
- Remember last setup values in localStorage
- Add "Presets" dropdown (e.g., "Stock WRX STI", "Lifted Tacoma")
- Show estimated visual changes as user adjusts values
- Add "Edit Setup" button in sidebar after completion


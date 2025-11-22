# Delta-Based Relative Sizing Implementation

## Overview
Implemented a full-stack solution that uses **relative instructions** instead of absolute values to help the AI accurately visualize different wheel sizes.

## What Was Built

### 1. **Delta Calculator Utility** (`lib/deltaCalculator.ts`)
- Compares current wheel setup with selected product
- Calculates percentage changes for:
  - **Diameter**: How much larger/smaller the new wheels are
  - **Width**: How much wider/narrower
  - **Offset**: How the stance changes (tucked vs. aggressive)
- Generates natural language instructions like:
  > "The NEW wheels are LARGER than the current 18" wheels in the photo. Increase the visible wheel diameter by approximately 11% (2.0" larger). CRITICAL: The tire sidewall should appear THINNER/LOWER to compensate for the larger rim."

### 2. **Current Setup Form** (`components/canvas/CurrentSetupForm.tsx`)
A UI component that captures:
- Current rim diameter (e.g., 18")
- Current rim width (optional)
- Current offset (optional)
- Suspension type (Stock/Lifted/Lowered)
- Lift/drop height if applicable

Appears automatically after image upload, can be hidden/reshown.

### 3. **Store Integration** (`store/useStore.ts`)
- Added `currentSetup` state to global store
- Default values: 18" diameter, 9" width, +35mm offset, stock suspension
- Added `setCurrentSetup()` action

### 4. **UI Integration** (`components/canvas/Canvas.tsx`)
- CurrentSetupForm shows in top-left after image upload
- Can be hidden/shown as needed
- Updates global store on every change

### 5. **Generation Flow** (`components/ui/GenerateButton.tsx`)
- Calculates delta before sending API request
- Logs delta analysis to console
- Sends `delta_instructions` and `current_setup` to API

### 6. **API Route** (`app/api/test-visualize/route.ts`)
- Receives delta instructions from frontend
- Injects relative sizing instructions into AI prompt
- Falls back to absolute specs if no delta available

## How It Works

### User Flow:
1. **Upload car photo** → Current Setup Form appears
2. **Fill in current specs** (e.g., "I have 18" wheels, stock suspension")
3. **Select new product** (e.g., "20x9.5 +35mm wheels")
4. **Click Generate** → System calculates delta
5. **AI receives instructions** like:
   - "Increase diameter by 11% relative to current"
   - "Decrease tire sidewall proportionally"
   - "Position wheel slightly more flush (lower offset)"

### Technical Flow:
```
Current Setup (18") + Selected Product (20")
          ↓
   calculateDelta()
          ↓
   "+2" diameter (11% larger)"
   "Thinner sidewall"
   "More aggressive stance"
          ↓
   Natural Language Instructions
          ↓
   AI Prompt with Relative Guidance
```

## Example Delta Instruction

**Input:**
- Current: 18x9 +35mm, Stock suspension
- New Product: 20x9.5 +25mm

**Generated Instructions:**
```
The vehicle is at stock suspension height.

The NEW wheels are LARGER than the current 18" wheels in the photo. 
Increase the visible wheel diameter by approximately 11% (2.0" larger). 
CRITICAL: The tire sidewall should appear THINNER/LOWER to compensate 
for the larger rim. The overall wheel+tire package should fill the 
wheel well MORE than it currently does.

The NEW wheels have a LOWER offset (+25mm vs +35mm). Position the 
wheel face CLOSER TO the fender edge. The wheel should sit MORE 
FLUSH/AGGRESSIVE than currently shown. There should be LESS SPACE 
between the tire sidewall and the fender edge.

PROPORTIONAL REFERENCE: Use the current wheel position, brake caliper 
size, and wheel well opening as reference points. All changes should 
be RELATIVE to these fixed reference points in the original image.
```

## Benefits

1. **More Accurate**: AI understands "10% larger" better than "20 inches"
2. **Context-Aware**: Takes into account suspension modifications
3. **Reference-Based**: Uses brake calipers, wheel wells as fixed anchors
4. **Human-Readable**: Instructions are clear and logical
5. **Flexible**: Works with partial information (estimates missing values)

## Testing

After the dev server restarts:
1. Upload a car photo
2. Fill in the Current Setup Form with your actual wheel specs
3. Select a different wheel size from the sidebar
4. Check browser console for delta analysis logs
5. Generate and observe if sizing is more accurate

## Next Steps

- Fine-tune the percentage calculations based on real-world testing
- Add visual preview of what delta changes mean
- Consider adding "presets" for common setups (Stock WRX, Lifted Tacoma, etc.)
- Implement similar delta logic for suspension changes


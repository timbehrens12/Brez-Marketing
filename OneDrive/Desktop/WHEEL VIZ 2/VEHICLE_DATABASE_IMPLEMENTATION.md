# Vehicle Database & Auto-Fill Implementation

## Overview
Added a **vehicle database** with stock wheel specifications for 25+ popular vehicles. Users can now select their car's Make/Model/Trim and the form **automatically fills** with factory specs!

## What Was Built

### 1. **Vehicle Database** (`lib/vehicleDatabase.ts`)
- **25+ vehicles** from popular makes:
  - Subaru (WRX, STI, BRZ)
  - Honda (Civic Sport, Type R)
  - Toyota (Tacoma, 4Runner, Camry)
  - Ford (Mustang GT, F-150)
  - Nissan (370Z, GT-R)
  - BMW (3 Series, M3)
  - Volkswagen (GTI, Golf R)
  - Dodge (Challenger, Charger)
  - Chevrolet (Camaro SS, Silverado)

- **Stock specs include:**
  - Rim diameter
  - Rim width
  - Offset
  - Bolt pattern
  - Suspension type (stock)
  - Year ranges

### 2. **Helper Functions:**
- `getAvailableMakes()` - Get all makes
- `getModelsForMake(make)` - Get models for a make
- `getTrimsForModel(make, model)` - Get trims with specs
- `getVehicleSpecs(make, model, trim)` - Get specific vehicle

### 3. **Updated CurrentSetupForm** (`components/canvas/CurrentSetupForm.tsx`)
- **Two modes:**
  - **"Select Vehicle"** - Choose from database (auto-fill)
  - **"Manual Entry"** - Enter custom specs

- **Cascading dropdowns:**
  - Make → Model → Trim
  - Each selection narrows down options
  - Shows year range for each trim

- **Auto-fill behavior:**
  - When vehicle is selected → specs populate automatically
  - Fields become **read-only** (grayed out)
  - Shows success message: "✓ Stock specs loaded for..."

- **Manual override:**
  - Click "Manual Entry" to unlock fields
  - Enter custom/modified specs

## User Experience

### Flow 1: Stock Vehicle
```
1. Upload car photo
2. Modal appears → Click "Select Vehicle"
3. Choose Make: "Subaru"
4. Choose Model: "WRX"
5. Choose Trim: "STI (2015-2021)"
6. ✓ Form auto-fills:
   - Diameter: 18"
   - Width: 8.5"
   - Offset: +55mm
   - Suspension: Stock
7. Click "Confirm Setup" → Done!
```

### Flow 2: Modified Vehicle
```
1. Upload car photo
2. Modal appears → Click "Manual Entry"
3. Manually enter specs:
   - Diameter: 19"
   - Width: 9.5"
   - Offset: +35mm
   - Suspension: Lowered (2")
4. Click "Confirm Setup" → Done!
```

### Flow 3: Stock with Suspension Mod
```
1. Select vehicle (auto-fills wheel specs)
2. Change "Suspension Type" to "Lowered"
3. Enter drop height: "2""
4. Wheel specs stay from database
5. Suspension context updated
```

## Visual Design

### Mode Toggle:
```
┌─────────────────────────────────┐
│ [Select Vehicle] [Manual Entry] │ ← Toggle buttons
└─────────────────────────────────┘
```

### Vehicle Selection Mode:
```
┌─────────────────────────────────┐
│ Make: [Subaru           ▼]     │
│ Model: [WRX             ▼]     │
│ Trim: [STI (2015-2021)  ▼]     │
│                                 │
│ ✓ Stock specs loaded for        │
│   Subaru WRX STI               │
├─────────────────────────────────┤
│ Rim Diameter: [18"] (locked)   │
│ Rim Width: [8.5"] (locked)     │
│ Offset: [+55mm] (locked)       │
└─────────────────────────────────┘
```

### Manual Mode:
```
┌─────────────────────────────────┐
│ Rim Diameter: [18]   inches    │ ← Editable
│ Rim Width: [9]   inches        │ ← Editable
│ Offset: [35]   mm              │ ← Editable
│ Suspension: [Stock ▼]          │ ← Editable
└─────────────────────────────────┘
```

## Database Structure

```typescript
{
  make: 'Subaru',
  model: 'WRX',
  trim: 'STI',
  year: '2015-2021',
  stockSpecs: {
    rimDiameter: 18,
    rimWidth: 8.5,
    offset: 55,
    boltPattern: '5x114.3',
    suspensionType: 'stock',
  }
}
```

## Benefits

1. **Faster Setup** - Most users can find their car in 3 clicks
2. **Accurate Data** - Stock specs from manufacturer data
3. **No Guessing** - Users don't need to know their exact offset
4. **Flexibility** - Can still manually override for modded cars
5. **Better UX** - Clear indication when specs are loaded
6. **Scalable** - Easy to add more vehicles to database

## Current Database Coverage

### Makes (10):
- BMW
- Chevrolet
- Dodge
- Ford
- Honda
- Nissan
- Subaru
- Toyota
- Volkswagen

### Popular Models Included:
- Sports: WRX STI, Civic Type R, Mustang GT, 370Z, Golf R, M3
- Sedans: Camry, 3 Series, Charger
- Trucks: Tacoma, F-150, Silverado, 4Runner
- Coupes: BRZ, Challenger, Camaro

## Future Enhancements

- [ ] Add 50+ more vehicles
- [ ] Include aftermarket suspension presets (Coilovers, Lift kits)
- [ ] Add "Common Mods" presets ("+1" sizing, square setup, etc.)
- [ ] Allow users to save custom presets
- [ ] Community-contributed vehicle database
- [ ] VIN lookup API integration
- [ ] Show tire size recommendations based on wheel size

## Adding New Vehicles

To add a new vehicle to the database:

```typescript
{
  make: 'Make Name',
  model: 'Model Name',
  trim: 'Trim Name',
  year: 'YYYY-YYYY', // Optional
  stockSpecs: {
    rimDiameter: 18, // inches
    rimWidth: 8, // inches
    offset: 45, // mm
    boltPattern: '5x114.3', // Optional
    suspensionType: 'stock',
  },
}
```

Add to `VEHICLE_DATABASE` array in `lib/vehicleDatabase.ts`.

## Testing

- [ ] Select Subaru WRX STI → Specs auto-fill to 18x8.5 +55
- [ ] Change to Manual Mode → Fields become editable
- [ ] Select different trim → Specs update
- [ ] Change suspension to "Lowered" → Lift field appears
- [ ] Submit form → Delta calculator uses auto-filled specs


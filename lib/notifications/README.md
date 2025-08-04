# Simple Notification System

This is the new, simplified notification system that replaces the complex `useActionCenter` hook.

## Architecture

### 1. Store (`stores/useNotificationStore.ts`)
- **Zustand store** for global notification state
- Simple counters: `todoCount`, `brandHealthCount`, `toolsCount`, `totalCount`
- Basic actions: increment, decrement, mark as read, refresh

### 2. Count Calculator (`lib/notifications/calculateCounts.ts`)
- **Single function** `calculateNotificationCounts()` that fetches all counts
- No complex caching, no race conditions
- Direct database queries with error handling
- Updates the store when complete

### 3. Simple Hook (`hooks/useSimpleNotifications.ts`)
- **Drop-in replacement** for the old `useActionCenter` hook
- Returns same interface for backward compatibility
- Automatic refresh every 30 seconds
- Manual refresh via `refresh()` function

## Usage

### Basic Usage
```typescript
import { useSimpleNotifications } from '@/hooks/useSimpleNotifications'

function MyComponent() {
  const { counts, isLoading, refresh } = useSimpleNotifications()
  
  return (
    <div>
      Total notifications: {counts.total}
      <button onClick={refresh}>Refresh</button>
    </div>
  )
}
```

### Backward Compatibility
```typescript
// Old complex way
const { actionCenterCounts } = useActionCenter(mutedNotifications)

// New simple way (same interface)
const { actionCenterCounts } = useSimpleNotifications()
```

### Manual Refresh
```typescript
import { triggerNotificationRefresh } from '@/hooks/useSimpleNotifications'

// Trigger refresh from anywhere
triggerNotificationRefresh()

// Or via event
window.dispatchEvent(new CustomEvent('refresh-notifications'))
```

## Benefits

✅ **Reliable counting** - Single source of truth  
✅ **Real-time updates** - Direct state updates  
✅ **No race conditions** - No complex async chains  
✅ **Debuggable** - Simple, linear code flow  
✅ **Maintainable** - 100 lines vs 995 lines  

## Migration

The old `useActionCenter` hook has been deprecated but not deleted for reference. All components now use `useSimpleNotifications`.

**Removed complexity:**
- Global coordination variables
- Complex caching mechanisms  
- Multiple event listeners
- Race condition prevention
- Muting filter logic (simplified)
- Task state management (simplified)

**What stayed the same:**
- Return interface (backward compatible)
- Database queries (simplified but same data)
- Update triggers (same events)
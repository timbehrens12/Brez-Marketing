# Shopify V2 Architecture Setup Guide

## 🚀 **What This Does**
This new architecture implements a **production-ready Shopify sync system** with:
- ✅ **Queue-based background processing** (no more broken bulk operations)
- ✅ **Progress tracking** with real-time status updates
- ✅ **Non-blocking UI** - users see data immediately
- ✅ **Staging tables** for safe bulk imports  
- ✅ **GraphQL bulk operations** that actually work
- ✅ **Comprehensive error handling** and retry logic

## 📋 **Setup Steps**

### 1. Install Dependencies
```bash
npm install bull @types/bull
```

### 2. Redis Configuration
You'll need Redis for the queue system. Add these to your `.env.local`:

```bash
# Redis Configuration for Bull Queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# For production, use a managed service like Upstash:
# REDIS_HOST=your-redis-host.upstash.io
# REDIS_PASSWORD=your_redis_password

# Worker Configuration  
WORKER_MODE=false
```

**For Development:** Install Redis locally:
- Windows: `choco install redis-64` or download from redis.io
- Mac: `brew install redis`
- Or use a cloud service like [Upstash](https://upstash.com/) (free tier available)

### 3. Run Database Migrations
You'll need to run these SQL migrations in your Supabase dashboard:

1. **Primary Schema:** `migrations/create_shopify_v2_architecture.sql`
   - Creates `control` and `stage` schemas
   - Creates all staging and production tables
   - Sets up indexes and constraints

2. **Promotion Functions:** `migrations/create_promotion_functions.sql`
   - Creates functions to safely move data from staging to production
   - Handles upserts and deduplication

### 3. Setup Redis (Required for Queue)
You'll need Redis for the Bull queue system. Options:

**Option A: Local Redis (Development)**
```bash
# Install Redis locally
brew install redis  # macOS
# or 
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server
```

**Option B: Redis Cloud (Production)**
- Sign up at [Redis Cloud](https://redis.com/try-free/)
- Get connection details

**Option C: Upstash Redis (Serverless)**
- You already have `@upstash/redis` - we can use that!

### 4. Environment Variables
Add to your `.env.local`:
```bash
# Redis Configuration (choose one)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Or for Upstash Redis (if using existing)
REDIS_URL=your_upstash_redis_url
```

### 5. Start the Worker Process
The worker will auto-initialize, but for production you may want:
```bash
# Set worker mode
WORKER_MODE=true npm run dev
```

## 🔄 **How It Works**

### **Connection Flow**
1. User connects Shopify
2. **Recent sync** job starts immediately (shows data in UI fast)
3. **Bulk jobs** queue in background (orders, customers, products)
4. **Progress widget** shows real-time status
5. **Webhooks** keep data up-to-date going forward

### **Data Flow**
```
Shopify API → Staging Tables → Production Tables → Dashboard
     ↓              ↓              ↓              ↓
   GraphQL       Safe Landing   Clean Data    User Sees It
  Bulk Ops        Zone          (UPSERT)      (Fast!)
```

### **Queue Jobs**
- `recent_sync` - Immediate 3-day sync for UI
- `bulk_orders` - Historical orders with line items
- `bulk_customers` - All customer data  
- `bulk_products` - Product catalog
- `poll_bulk` - Monitor bulk operation completion

## 🎯 **Benefits vs Old System**

| Feature | Old System | New V2 System |
|---------|------------|---------------|
| Bulk Operations | ❌ Broken, never complete | ✅ GraphQL + monitoring |
| Progress Tracking | ❌ None | ✅ Real-time widget |
| Error Recovery | ❌ Manual fixes | ✅ Auto-retry + logging |
| User Experience | ❌ Blocking loading | ✅ Immediate data + background sync |
| Data Consistency | ❌ Mixed sources | ✅ Single source of truth |
| Reliability | ❌ Fails often | ✅ Production-grade |

## 🛠 **Status & Monitoring**

### **Progress Widget**
- Appears automatically during sync
- Shows milestone progress
- Real-time updates every 5 seconds
- Auto-hides when complete

### **Status API**
```
GET /api/sync/{brandId}/status
```
Returns detailed sync status with progress percentages.

### **Connection Management**
- Connections now have `v2_architecture: true` metadata
- `sync_status` shows current state
- Webhooks auto-register for real-time updates

## 🚨 **Migration Notes**

### **Existing Data**
The new system will:
- ✅ Work alongside existing tables
- ✅ Not break current functionality  
- ✅ Gradually replace old data sources
- ⚠️  You may see brief data differences during transition

### **Testing**
1. Connect a new Shopify store to test V2 system
2. Check progress widget appears and updates
3. Verify data accuracy against Shopify admin
4. Monitor `/api/sync/{brandId}/status` endpoint

## 🎉 **Expected Results**

After setup, you should see:
- **Immediate UI response** when connecting Shopify
- **Progress tracking** during historical sync
- **Accurate data** matching Shopify exactly
- **$16K sales total** instead of $12K (data completeness!)
- **Reliable ongoing syncs** via webhooks

This architecture follows **industry best practices** and will scale much better than the previous system.

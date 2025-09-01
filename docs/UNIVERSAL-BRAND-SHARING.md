# Universal Brand Sharing System

This document describes the new universal brand sharing system that allows users to share access to multiple brands through a single invitation link.

## Overview

The universal brand sharing system replaces individual brand sharing with a centralized approach that enables:

- **Multi-brand selection**: Choose multiple brands to share at once
- **Universal access control**: Set roles and permissions for all selected brands
- **Enhanced invitations**: Rich invitation pages showing all brands with their details
- **Agency integration**: Display agency information and platform connections
- **Efficient management**: Centralized sharing interface

## Features

### 🎯 Brand Selection Page (`/share-brands`)

- **Multi-select interface**: Choose multiple brands using checkbox widgets
- **Search and filter**: Find brands by name, niche, or agency
- **Brand widgets**: Display brand info, agency details, and connected platforms
- **Bulk operations**: Select all/deselect all functionality

### 🔗 Universal Share Links

- **Multi-brand support**: Single link grants access to multiple brands
- **Role-based access**: Viewer, Media Buyer, or Admin roles
- **Configurable expiration**: 1 day to 1 month
- **Usage limits**: 1 to 100 uses per link
- **Link management**: Copy, revoke, and track usage

### 📧 Enhanced Invitations

- **Rich brand display**: Show all brands with images, niches, and platform connections
- **Agency branding**: Display agency logos and information
- **Platform indicators**: Visual icons for Shopify, Meta, etc.
- **User attribution**: Show who created the invitation

## Technical Implementation

### Database Schema

```sql
-- Add multi-brand support to brand_share_links table
ALTER TABLE brand_share_links 
ADD COLUMN brand_ids jsonb,                 -- Array of brand IDs
ADD COLUMN is_multi_brand boolean DEFAULT false;

-- Index for efficient queries
CREATE INDEX idx_brand_share_links_brand_ids ON brand_share_links USING gin(brand_ids);
```

### API Endpoints

#### Create Multi-Brand Share Link
```typescript
POST /api/brand-access/multi-share
{
  "brandIds": ["brand1", "brand2"],
  "role": "media_buyer",
  "expiresInDays": 7,
  "maxUses": 5
}
```

#### Revoke Share Link
```typescript
DELETE /api/brand-access/multi-share
{
  "linkId": "link-id"
}
```

### Components

- **`/app/share-brands/page.tsx`**: Main brand sharing interface
- **`/app/api/brand-access/multi-share/route.ts`**: Multi-brand sharing API
- **Updated `/app/join/[token]/page.tsx`**: Enhanced invitation page

## User Workflow

1. **Access sharing**: User clicks "Share Brand Access" in Connection Management
2. **Brand selection**: Choose brands using the multi-select interface
3. **Configure access**: Set role, expiration, and usage limits
4. **Generate link**: System creates shareable invitation URL
5. **Share invitation**: Send link to team members
6. **Accept invitation**: Recipients see detailed brand information and accept
7. **Grant access**: System creates brand access records for all selected brands

## Benefits

### For Agency Owners
- **Efficient sharing**: Share multiple brands in one action
- **Centralized management**: All sharing from one interface
- **Better visibility**: See all active share links in one place
- **Flexible permissions**: Granular control over access levels

### For Invited Users
- **Clear overview**: See all brands and their details upfront
- **Agency context**: Understand which agency is sharing access
- **Platform visibility**: Know which platforms are connected
- **Streamlined onboarding**: Accept multiple brands at once

### For Developers
- **Scalable architecture**: Easy to extend for future features
- **Backward compatibility**: Existing single-brand links still work
- **Type safety**: Full TypeScript support
- **Consistent UI**: Matches existing design system

## Migration Notes

### Database Migration Required

Run the migration in `migrations/add_multi_brand_sharing_support.sql`:

```sql
-- See migrations/add_multi_brand_sharing_support.sql for full migration
ALTER TABLE brand_share_links 
ADD COLUMN brand_ids jsonb,
ADD COLUMN is_multi_brand boolean DEFAULT false;
```

### Breaking Changes

- Individual `BrandSharingDialog` component replaced with universal sharing
- New invitation UI requires updated `ShareLinkData` interface
- Multi-brand join API supports both single and multi-brand scenarios

### Backward Compatibility

- Existing single-brand share links continue to work
- Legacy brand access grants unchanged
- Old invitation URLs redirect properly

## Future Enhancements

- **Bulk role management**: Change roles for multiple users at once
- **Template sharing**: Save common brand combinations as templates
- **Advanced filtering**: Filter brands by connection status, metrics, etc.
- **Analytics**: Track sharing patterns and usage statistics
- **Notifications**: Email notifications for access grants/revokes 
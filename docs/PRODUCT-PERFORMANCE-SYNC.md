# Product Performance Data Sync

This document explains how the product performance data sync works in the marketing dashboard.

## Overview

The product performance feature allows you to track and analyze the performance of your Shopify products, including metrics like:

- View-to-purchase ratios
- Return rates
- Average ratings and review counts
- Inventory turnover rates
- Revenue and profit margins
- Product relationships (frequently bought together, cross-sells, etc.)
- Customer reviews

## How the Sync Works

The sync process connects to your Shopify store and retrieves real data about your products, orders, and customer behavior. This data is then processed to calculate performance metrics and stored in your database.

### Sync Process Steps

1. **Fetch Products**: Retrieves all products from your Shopify store, including variants, SKUs, and other product details.
2. **Fetch Orders**: Gets order data from the last 90 days to analyze purchase patterns, revenue, and returns.
3. **Calculate Metrics**: Processes the raw data to calculate performance metrics for each product.
4. **Identify Relationships**: Analyzes order data to find products that are frequently purchased together.
5. **Gather Reviews**: Collects review data for your products (if available).
6. **Store Data**: Saves all the processed data to your database for display in the dashboard.

## How to Use

1. Navigate to the Product Performance widget in your dashboard.
2. Click the "Sync Shopify Data" button in the top-right corner.
3. Wait for the sync to complete (this may take a few minutes depending on the size of your store).
4. Once complete, the dashboard will automatically refresh with your real Shopify data.

## Data Tables

The sync process populates the following database tables:

- `product_performance_metrics`: Contains the main performance metrics for each product.
- `product_relationships`: Stores information about product relationships (frequently bought together, etc.).
- `product_reviews`: Stores customer reviews for your products.

## Troubleshooting

If you encounter issues with the sync process:

1. **No Shopify Connection**: Ensure your Shopify store is properly connected in the dashboard settings.
2. **Sync Fails**: Check that your Shopify API access is still valid and has the necessary permissions.
3. **No Data After Sync**: If you see "Using mock data for demonstration" after a sync, it means the system couldn't find real data in your Shopify store. This could be because:
   - Your store is new and doesn't have enough order data
   - The connection to Shopify has limited permissions
   - There was an error processing your store's data

## Notes on Data Accuracy

- **View Data**: Product view data may be estimated if your Shopify store doesn't have analytics tracking enabled.
- **Profit Margins**: These are estimated based on available data, as Shopify doesn't directly expose cost information.
- **Inventory Turnover**: This is calculated based on available inventory and sales data, but may not match your accounting figures exactly.

## Data Refresh Schedule

For optimal performance, we recommend syncing your product performance data:

- After major sales or promotions
- When launching new products
- At least once per month to keep metrics current

## Privacy and Security

All data synced from your Shopify store is stored securely in your private database and is only accessible to authorized users of your dashboard. 
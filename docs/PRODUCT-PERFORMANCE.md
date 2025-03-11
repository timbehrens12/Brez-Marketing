# Product Performance Tracking System

This document provides an overview of the product performance tracking system implemented in the marketing dashboard.

## Overview

The product performance tracking system allows you to monitor and analyze the performance of your products across various metrics. It provides insights into:

- View-to-purchase ratios
- Return rates
- Inventory turnover
- Product relationships (cross-sells, upsells, frequently bought together)
- Customer reviews and sentiment

## Database Structure

The system uses the following tables:

1. **product_performance_metrics**: Core metrics for each product
2. **product_relationships**: Relationships between products
3. **product_reviews**: Customer reviews and ratings
4. **product_views**: Detailed tracking of product page views
5. **product_returns**: Information about returned products
6. **inventory_turnover**: Inventory movement and turnover rates

## API Endpoints

### GET /api/shopify/products/performance

Retrieves product performance data for a specific brand.

**Query Parameters:**
- `brandId` (required): The UUID of the brand to retrieve data for

**Response Format:**
```json
{
  "products": [
    {
      "id": "123456789",
      "name": "Premium T-Shirt",
      "sku": "TS-001",
      "viewsCount": 1500,
      "purchasesCount": 300,
      "viewToPurchaseRatio": 20.0,
      "returnRate": 5.2,
      "averageRating": 4.5,
      "reviewCount": 45,
      "inventoryTurnoverRate": 3.2,
      "revenueGenerated": 15000.00,
      "profitMargin": 35.5,
      "lastUpdated": "2023-05-15T10:30:00Z"
    }
  ],
  "relationships": [
    {
      "productId": "123456789",
      "relatedProductId": "234567890",
      "relationshipType": "frequently_bought_together",
      "strength": 85,
      "conversionRate": 32.5
    }
  ],
  "reviews": [
    {
      "productId": "123456789",
      "rating": 5,
      "title": "Great quality!",
      "text": "The fabric is amazing and it fits perfectly.",
      "sentimentScore": 0.9,
      "verifiedPurchase": true,
      "helpfulVotes": 12,
      "reviewedAt": "2023-05-01T14:25:00Z"
    }
  ]
}
```

## Dashboard Components

### ProductPerformance Component

The `ProductPerformance` component displays product performance data in a user-friendly interface. It includes:

- A table of products with key metrics
- Visualizations of performance trends
- Related product recommendations
- Customer review highlights

## Setting Up Sample Data

To populate the system with sample data, run the following SQL script:

```bash
psql -U your_username -d your_database -f scripts/populate_product_performance.sql
```

Or execute the script directly in your database management tool.

## Adding New Products

New products are automatically added to the tracking system when they are created in your Shopify store. The system will begin collecting data for these products immediately.

## Customizing Metrics

You can customize which metrics are displayed in the dashboard by modifying the `ProductPerformance.tsx` component.

## Troubleshooting

### No Data Appears in the Dashboard

1. Ensure you have connected your Shopify store
2. Check that you have at least one product in your store
3. Verify that the sample data script has been run
4. Check the browser console for any API errors

### Incorrect Metrics

If metrics appear incorrect:

1. Verify the data in your database tables
2. Check the calculation logic in the API endpoint
3. Ensure that the correct brand ID is being passed to the API

## Future Enhancements

Planned enhancements for the product performance tracking system include:

1. Advanced filtering and sorting options
2. Export functionality for reports
3. Predictive analytics for inventory management
4. A/B testing integration for product descriptions and images
5. Competitor price comparison 
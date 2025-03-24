# Customer Geography 3D Globe Visualization

## Overview

The Customer Geography widget has been enhanced with an interactive 3D globe visualization that provides a more engaging and intuitive way to view the geographic distribution of customers. This feature replaces the previous 2D map visualization with a fully interactive globe that can be rotated, zoomed, and explored.

## Features

- **Interactive 3D Globe**: Users can spin, rotate, and zoom the globe to explore customer locations from any angle.
- **Metropolitan Area Clustering**: Suburbs are automatically grouped with their major metropolitan areas (e.g., Spring, TX is shown as part of Houston) to provide a cleaner visualization.
- **Color-Coded Data Points**: 
  - Gray dots represent locations with customers but no revenue
  - Blue dots (with varying intensity) represent locations with revenue
  - The size of each dot corresponds to the number of customers in that location
- **Glow Effect**: Points with revenue have a subtle glow effect to make them stand out
- **Country Outlines**: The globe includes simplified country outlines for geographic context

## Technical Implementation

The 3D globe is implemented using Three.js, a powerful JavaScript 3D library. Key components include:

- **Three.js**: For 3D rendering and scene management
- **OrbitControls**: For interactive camera controls (rotation, zoom, pan)
- **GeoJSON Data**: Simplified world geography data for country outlines
- **City Clustering Algorithm**: Logic to group suburbs with their metropolitan areas based on:
  - Known suburb-to-metro mappings
  - Geographic proximity (within 50km of a metro center)

## Usage

The globe automatically loads when viewing the Customer Geography widget on the dashboard. No additional configuration is required.

### Interaction

- **Rotate**: Click and drag to rotate the globe
- **Zoom**: Use the mouse wheel to zoom in and out
- **Reset**: Double-click to reset the view

## Data Representation

The visualization uses data from the `/api/shopify/customers/geographic` endpoint, which provides:

- Customer counts by location
- Revenue by location
- Geographic coordinates (latitude/longitude)

## Future Enhancements

Potential future improvements to the 3D globe visualization:

1. **Time-based Animation**: Show customer acquisition over time
2. **Filtering Options**: Allow filtering by customer segments or time periods
3. **Detailed Information**: Add tooltips or popups with detailed information when hovering over locations
4. **Performance Optimization**: Further optimize for mobile devices and lower-end hardware
5. **Additional Metrics**: Add visualization options for other metrics like average order value or customer lifetime value 
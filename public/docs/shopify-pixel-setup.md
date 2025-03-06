# Brez Analytics Pixel Setup Guide

This guide will help you set up the Brez Analytics Pixel in your Shopify store to get real-time analytics data.

## What is the Brez Analytics Pixel?

The Brez Analytics Pixel is a small piece of JavaScript code that runs on your Shopify store. It tracks visitor behavior and sends the data to your Brez dashboard, giving you real-time insights into your store's performance.

## Benefits of Using the Brez Analytics Pixel

- **Real-time data**: See visitor activity as it happens
- **Accurate metrics**: Get precise session counts, not estimates
- **Detailed insights**: Track page views, product views, checkout events, and more
- **No configuration needed**: Works automatically with your Brez dashboard

## Installation Options

There are two ways to install the Brez Analytics Pixel:

### Option 1: Using the Shopify App (Recommended)

1. Go to your Shopify admin dashboard
2. Navigate to **Apps > App Store**
3. Search for "Brez Analytics"
4. Click **Add app**
5. Follow the installation prompts
6. The pixel will be automatically installed and configured

### Option 2: Manual Installation

If you prefer to install the pixel manually, follow these steps:

1. Go to your Shopify admin dashboard
2. Navigate to **Online Store > Themes**
3. Click **Actions > Edit code** for your active theme
4. In the **Layout** folder, open the `theme.liquid` file
5. Find the closing `</head>` tag
6. Paste the following code just before the closing `</head>` tag:

```html
<!-- Brez Analytics Pixel -->
<script>
  (function() {
    // Create a script element
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://your-domain.com/shopify-pixel.js';
    
    // Insert the script element into the head
    var head = document.getElementsByTagName('head')[0];
    head.appendChild(script);
  })();
</script>
<!-- End Brez Analytics Pixel -->
```

7. Replace `https://your-domain.com/shopify-pixel.js` with the actual URL to your pixel script
8. Click **Save**

## Verifying Installation

To verify that the pixel is installed correctly:

1. Go to your Brez dashboard
2. Navigate to the **Sessions** widget
3. Look for the green "Real-time analytics data" indicator
4. Visit your Shopify store and perform some actions (view pages, products, etc.)
5. Return to your Brez dashboard and check if the data is updating

## Troubleshooting

If you don't see the real-time indicator or your data isn't updating:

1. Make sure you've installed the pixel correctly
2. Check your browser console for any errors
3. Verify that your Shopify store is connected to your Brez account
4. Try disconnecting and reconnecting your Shopify store in the Brez dashboard

## Need Help?

If you're having trouble installing the pixel or have any questions, please contact our support team at support@brez.io. 
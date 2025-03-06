// Shopify Web Pixel
(function() {
  // Configuration
  const config = {
    apiEndpoint: window.location.hostname.includes('localhost') 
      ? 'http://localhost:3000/api/shopify/web-pixels' 
      : 'https://your-production-domain.com/api/shopify/web-pixels',
    shop: Shopify.shop || window.location.hostname,
    debug: false // Set to true to enable debug logging
  };

  // Initialize analytics
  function init() {
    if (config.debug) {
      console.log('Initializing Brez Analytics Pixel for', config.shop);
    }

    // Subscribe to Shopify events
    analytics.subscribe('page_viewed', (event) => {
      sendEvent('page_viewed', event);
    });

    analytics.subscribe('product_viewed', (event) => {
      sendEvent('product_viewed', event);
    });

    analytics.subscribe('checkout_started', (event) => {
      sendEvent('checkout_started', event);
    });

    analytics.subscribe('checkout_completed', (event) => {
      sendEvent('checkout_completed', event);
    });

    // Subscribe to all standard events
    analytics.subscribe('all_standard_events', (event) => {
      sendEvent(event.name, event);
    });
  }

  // Send event to our API
  function sendEvent(eventName, eventData) {
    if (config.debug) {
      console.log('Sending event:', eventName, eventData);
    }

    // Prepare data to send
    const data = {
      event: eventName,
      shop: config.shop,
      timestamp: new Date().toISOString(),
      data: eventData
    };

    // Send data to our API endpoint
    fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
      // Use keepalive to ensure the request completes even if the page is unloaded
      keepalive: true
    }).catch(error => {
      if (config.debug) {
        console.error('Error sending event:', error);
      }
    });
  }

  // Initialize when the analytics library is ready
  if (window.analytics) {
    init();
  } else {
    document.addEventListener('analytics:ready', init);
  }
})(); 
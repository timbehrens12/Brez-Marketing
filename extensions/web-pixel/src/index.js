import { register } from "@shopify/web-pixels-extension";

register(({ configuration, analytics, browser }) => {
  // Get configuration values
  const apiEndpoint = configuration.apiEndpoint || 
    "https://brezmarketingdashboard.com/api/shopify/web-pixels";
  const debug = configuration.debug || true;
  
  // Log initialization if debug is enabled
  if (debug) {
    console.log("Initializing Brez Analytics Pixel");
    console.log("API Endpoint:", apiEndpoint);
  }
  
  // Helper function to send events to our API
  const sendEvent = (eventName, eventData) => {
    if (debug) {
      console.log("Sending event:", eventName, eventData);
    }
    
    // Prepare data to send
    const data = {
      event: eventName,
      shop: browser.shop.domain,
      timestamp: new Date().toISOString(),
      data: eventData
    };
    
    // Send data to our API endpoint
    fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data),
      // Use keepalive to ensure the request completes even if the page is unloaded
      keepalive: true
    }).catch(error => {
      if (debug) {
        console.error("Error sending event:", error);
      }
    });
  };
  
  // Subscribe to page view events
  analytics.subscribe("page_viewed", (event) => {
    sendEvent("page_viewed", event);
  });
  
  // Subscribe to product view events
  analytics.subscribe("product_viewed", (event) => {
    sendEvent("product_viewed", event);
  });
  
  // Subscribe to checkout events
  analytics.subscribe("checkout_started", (event) => {
    sendEvent("checkout_started", event);
  });
  
  analytics.subscribe("checkout_completed", (event) => {
    sendEvent("checkout_completed", event);
  });
  
  // Subscribe to all standard events
  analytics.subscribe("all_standard_events", (event) => {
    sendEvent(event.name, event);
  });
  
  // Subscribe to all custom events
  analytics.subscribe("all_custom_events", (event) => {
    sendEvent(event.name, event);
  });
}); 
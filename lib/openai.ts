import OpenAI from 'openai';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30 second timeout
  maxRetries: 2, // Limit retries to avoid long waits
});

/**
 * Send a request to GPT-4 with a system prompt and user message
 * @param systemPrompt - Instructions for the AI's behavior and context
 * @param userMessage - The specific query or data to analyze
 * @param temperature - Controls randomness (0-1), lower is more deterministic
 * @returns The AI's response text
 */
export async function getGPT4Response(
  systemPrompt: string,
  userMessage: string,
  temperature: number = 0.7
): Promise<string> {
  try {
    // Limit the size of the user message to avoid token limits
    const truncatedMessage = truncateMessage(userMessage, 8000);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: truncatedMessage }
      ],
      temperature,
      max_tokens: 1500, // Reduced from 2000 to improve response time
    });

    return response.choices[0].message.content || 'No response generated';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Truncate a message to a maximum number of characters
 * @param message - The message to truncate
 * @param maxLength - The maximum length in characters
 * @returns The truncated message
 */
function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  
  // If it's JSON, try to truncate intelligently
  if (message.startsWith('{') && message.endsWith('}')) {
    try {
      const data = JSON.parse(message);
      
      // Handle new data structure with platforms
      if (data.platforms) {
        // Truncate Shopify data if it exists
        if (data.platforms.shopify) {
          if (data.platforms.shopify.sales && Array.isArray(data.platforms.shopify.sales) && data.platforms.shopify.sales.length > 10) {
            data.platforms.shopify.sales = data.platforms.shopify.sales.slice(0, 10);
            data.platforms.shopify.sales.push({ note: `${data.platforms.shopify.sales.length - 10} more items truncated` });
          }
          
          if (data.platforms.shopify.customers && Array.isArray(data.platforms.shopify.customers) && data.platforms.shopify.customers.length > 10) {
            data.platforms.shopify.customers = data.platforms.shopify.customers.slice(0, 10);
            data.platforms.shopify.customers.push({ note: `${data.platforms.shopify.customers.length - 10} more items truncated` });
          }
          
          if (data.platforms.shopify.products && Array.isArray(data.platforms.shopify.products) && data.platforms.shopify.products.length > 10) {
            data.platforms.shopify.products = data.platforms.shopify.products.slice(0, 10);
            data.platforms.shopify.products.push({ note: `${data.platforms.shopify.products.length - 10} more items truncated` });
          }
          
          if (data.platforms.shopify.inventory && Array.isArray(data.platforms.shopify.inventory) && data.platforms.shopify.inventory.length > 10) {
            data.platforms.shopify.inventory = data.platforms.shopify.inventory.slice(0, 10);
            data.platforms.shopify.inventory.push({ note: `${data.platforms.shopify.inventory.length - 10} more items truncated` });
          }
        }
        
        // Truncate Meta data if it exists
        if (data.platforms.meta && data.platforms.meta.adData && Array.isArray(data.platforms.meta.adData) && data.platforms.meta.adData.length > 10) {
          data.platforms.meta.adData = data.platforms.meta.adData.slice(0, 10);
          data.platforms.meta.adData.push({ note: `${data.platforms.meta.adData.length - 10} more items truncated` });
        }
      } else {
        // Handle legacy data structure
        if (data.sales && Array.isArray(data.sales) && data.sales.length > 10) {
          data.sales = data.sales.slice(0, 10);
          data.sales.push({ note: `${data.sales.length - 10} more items truncated` });
        }
        
        if (data.customers && Array.isArray(data.customers) && data.customers.length > 10) {
          data.customers = data.customers.slice(0, 10);
          data.customers.push({ note: `${data.customers.length - 10} more items truncated` });
        }
        
        if (data.products && Array.isArray(data.products) && data.products.length > 10) {
          data.products = data.products.slice(0, 10);
          data.products.push({ note: `${data.products.length - 10} more items truncated` });
        }
        
        if (data.inventory && Array.isArray(data.inventory) && data.inventory.length > 10) {
          data.inventory = data.inventory.slice(0, 10);
          data.inventory.push({ note: `${data.inventory.length - 10} more items truncated` });
        }
      }
      
      return JSON.stringify(data);
    } catch (e) {
      // If JSON parsing fails, fall back to simple truncation
      return message.substring(0, maxLength) + "...";
    }
  }
  
  // Simple truncation for non-JSON
  return message.substring(0, maxLength) + "...";
}

/**
 * Generate structured insights from e-commerce data
 * @param data - The e-commerce data to analyze
 * @param focusArea - Specific area to focus insights on (sales, customers, products, etc.)
 * @returns Structured insights object
 */
export async function generateEcommerceInsights(
  data: any,
  focusArea: 'sales' | 'customers' | 'products' | 'inventory' | 'marketing' | 'overall' = 'overall'
): Promise<any> {
  // Create a system prompt that instructs GPT-4 on how to analyze e-commerce data
  const systemPrompt = `You are an expert e-commerce analyst and marketing strategist. 
  Analyze the provided data and generate actionable insights and recommendations.
  Focus on ${focusArea} metrics and identify patterns, opportunities, and potential issues.
  Your analysis should be data-driven, specific, and immediately useful to an e-commerce business owner.
  Format your response as structured JSON with the following sections:
  - summary: A brief executive summary of key findings (1-2 sentences)
  - insights: Array of 2-3 specific insights, each with a title and description
  - opportunities: Array of 1-2 specific growth opportunities with clear next steps
  - risks: Array of 1 potential issue or risk to address
  - recommendations: Array of 2-3 specific, actionable recommendations
  
  Keep your analysis concise, specific, and actionable. Focus on business impact.
  IMPORTANT: Keep your response brief and to the point.`;

  // Prepare data - limit the amount of data sent to OpenAI
  const preparedData = prepareDataForAnalysis(data, focusArea);

  try {
    const response = await getGPT4Response(systemPrompt, JSON.stringify(preparedData), 0.2);
    // Parse the response back to a structured object
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating e-commerce insights:', error);
    // Return a fallback response if parsing fails
    return {
      summary: "Unable to generate insights due to an error or timeout.",
      insights: [
        {
          title: "Data Analysis Incomplete",
          description: "We couldn't complete the analysis of your data at this time. Please try again later or contact support if this issue persists."
        }
      ],
      opportunities: [],
      risks: [],
      recommendations: [
        {
          title: "Try Again Later",
          description: "Our AI analysis service is experiencing high demand. Please try again in a few minutes."
        }
      ]
    };
  }
}

/**
 * Prepare data for analysis by limiting the amount of data sent to OpenAI
 */
function prepareDataForAnalysis(data: any, focusArea: string): any {
  const result = { ...data };
  
  // Handle new data structure with platforms
  if (result.platforms) {
    // Process Shopify data
    if (result.platforms.shopify) {
      // Limit the number of items in arrays
      if (result.platforms.shopify.sales && Array.isArray(result.platforms.shopify.sales)) {
        result.platforms.shopify.sales = result.platforms.shopify.sales.slice(0, 20);
      }
      
      if (result.platforms.shopify.customers && Array.isArray(result.platforms.shopify.customers)) {
        result.platforms.shopify.customers = result.platforms.shopify.customers.slice(0, 20);
      }
      
      if (result.platforms.shopify.products && Array.isArray(result.platforms.shopify.products)) {
        result.platforms.shopify.products = result.platforms.shopify.products.slice(0, 20);
      }
      
      if (result.platforms.shopify.inventory && Array.isArray(result.platforms.shopify.inventory)) {
        result.platforms.shopify.inventory = result.platforms.shopify.inventory.slice(0, 20);
      }
      
      // Keep only relevant data for the focus area to reduce payload size
      if (focusArea !== 'overall') {
        if (focusArea !== 'sales') delete result.platforms.shopify.sales;
        if (focusArea !== 'customers') delete result.platforms.shopify.customers;
        if (focusArea !== 'products') delete result.platforms.shopify.products;
        if (focusArea !== 'inventory') delete result.platforms.shopify.inventory;
      }
    }
    
    // Process Meta data
    if (result.platforms.meta && result.platforms.meta.adData && Array.isArray(result.platforms.meta.adData)) {
      result.platforms.meta.adData = result.platforms.meta.adData.slice(0, 20);
    }
  } else {
    // Handle legacy data structure
    // Limit the number of items in arrays
    if (result.sales && Array.isArray(result.sales)) {
      result.sales = result.sales.slice(0, 20);
    }
    
    if (result.customers && Array.isArray(result.customers)) {
      result.customers = result.customers.slice(0, 20);
    }
    
    if (result.products && Array.isArray(result.products)) {
      result.products = result.products.slice(0, 20);
    }
    
    if (result.inventory && Array.isArray(result.inventory)) {
      result.inventory = result.inventory.slice(0, 20);
    }
    
    // Keep only relevant data for the focus area to reduce payload size
    if (focusArea !== 'overall') {
      if (focusArea !== 'sales') delete result.sales;
      if (focusArea !== 'customers') delete result.customers;
      if (focusArea !== 'products') delete result.products;
      if (focusArea !== 'inventory') delete result.inventory;
    }
  }
  
  return result;
}

/**
 * Generate natural language explanations of metrics and trends
 * @param metric - The metric name and data
 * @param historicalData - Historical data for context
 * @returns Natural language explanation
 */
export async function explainMetric(
  metric: { name: string; value: number; change: number },
  historicalData?: any[]
): Promise<string> {
  const systemPrompt = `You are an expert e-commerce analyst explaining metrics to a business owner.
  Provide a clear, concise explanation of what the metric means, why it changed, and what actions might be appropriate.
  Use plain language and focus on business impact. Keep your explanation to 2-3 sentences maximum.`;

  // Limit historical data to reduce payload
  const limitedHistoricalData = historicalData ? historicalData.slice(0, 10) : [];

  const userMessage = JSON.stringify({
    metric,
    historicalData: limitedHistoricalData
  });

  try {
    return await getGPT4Response(systemPrompt, userMessage, 0.3);
  } catch (error) {
    console.error('Error explaining metric:', error);
    return `${metric.name} is ${metric.value} with a ${metric.change}% change. Unable to provide a detailed explanation at this time.`;
  }
}

export default openai; 
import OpenAI from 'openai';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || 'No response generated';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  - insights: Array of 3-5 specific insights, each with a title and description
  - opportunities: Array of 2-3 specific growth opportunities with clear next steps
  - risks: Array of 1-2 potential issues or risks to address
  - recommendations: Array of 3-5 specific, actionable recommendations
  
  Keep your analysis concise, specific, and actionable. Focus on business impact.`;

  // Convert data to a string format that GPT-4 can process
  const dataString = JSON.stringify(data);

  try {
    const response = await getGPT4Response(systemPrompt, dataString, 0.2);
    // Parse the response back to a structured object
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating e-commerce insights:', error);
    // Return a fallback response if parsing fails
    return {
      summary: "Unable to generate insights due to an error.",
      insights: [],
      opportunities: [],
      risks: [],
      recommendations: []
    };
  }
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

  const userMessage = JSON.stringify({
    metric,
    historicalData: historicalData || []
  });

  return getGPT4Response(systemPrompt, userMessage, 0.3);
}

export default openai; 
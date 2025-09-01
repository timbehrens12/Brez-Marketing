/**
 * MetaService class
 * 
 * Handles direct interaction with the Meta Graph API for campaign status checks.
 * Includes robust error handling and retry mechanisms.
 */

import { delay } from '@/lib/utils';

export class MetaService {
  private connection: any;
  private accessToken: string;
  private metaApiVersion = 'v18.0';
  
  constructor(connection: any) {
    this.connection = connection;
    this.accessToken = connection.access_token;
  }
  
  /**
   * Retrieves the current status of a Meta campaign.
   * Implements retry logic with exponential backoff for API rate limiting.
   * 
   * @param campaignId The ID of the campaign to check
   * @returns The status of the campaign (ACTIVE, PAUSED, etc.)
   */
  async getCampaignStatus(campaignId: string): Promise<string> {
    const maxRetries = 3;
    const initialBackoff = 3000; // Start with 3 seconds
    let retries = 0;
    let backoff = initialBackoff;
    
    // Clean the campaign ID - sometimes IDs come with 'act_' prefix that should be removed for status checks
    const cleanCampaignId = campaignId.replace(/^act_/, '');
    
    // Build the API URL
    const apiUrl = `https://graph.facebook.com/${this.metaApiVersion}/${cleanCampaignId}?fields=status,effective_status&access_token=${this.accessToken}`;
    
    while (retries <= maxRetries) {
      try {
        // Make the API request with timeout to avoid hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[MetaService] Failed to get campaign status, HTTP ${response.status}:`, errorText);
          
          // Check if we hit a rate limit (429)
          if (response.status === 429) {
            if (retries >= maxRetries) {
              throw new Error(`rate limit exceeded after ${retries} retries`);
            }
            
            // Implement exponential backoff
            retries++;
            console.log(`[MetaService] Rate limit hit, retrying in ${backoff/1000}s (retry ${retries}/${maxRetries})`);
            await delay(backoff);
            backoff *= 2;
            continue;
          }
          
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // Check for API error response
        if (data.error) {
          // Check if we hit rate limiting from Meta API
          if (data.error.code === 4 || data.error.code === 17 || data.error.code === 613 || 
              data.error.message?.includes('rate limit') || data.error.message?.includes('too many calls')) {
            
            if (retries >= maxRetries) {
              const error = new Error(`rate limit exceeded after ${retries} retries`);
              // @ts-ignore - Add code property to Error object
              error.code = data.error.code;
              throw error;
            }
            
            // Implement exponential backoff
            retries++;
            console.log(`[MetaService] Meta API rate limit hit, retrying in ${backoff/1000}s (retry ${retries}/${maxRetries})`);
            await delay(backoff);
            backoff *= 2;
            continue;
          }
          
          // For other errors, throw with the API error details
          const error = new Error(data.error.message || 'Unknown Meta API error');
          // @ts-ignore - Add code property to Error object
          error.code = data.error.code;
          throw error;
        }
        
        // Prefer effective_status as it's more accurate, fallback to status
        const status = data.effective_status || data.status || 'UNKNOWN';
        return status.toUpperCase(); // Normalize to uppercase for consistency
        
      } catch (error: any) {
        // Check for abort/timeout
        if (error.name === 'AbortError') {
          console.error(`[MetaService] Request timed out for campaign ${campaignId}`);
          if (retries >= maxRetries) {
            throw new Error(`request timed out after ${retries} retries`);
          }
          
          retries++;
          await delay(backoff);
          backoff *= 2;
          continue;
        }
        
        // Check if this is already a handled error with retry logic
        if (error.message?.includes('rate limit') || error.message?.includes('timed out')) {
          throw error; // Re-throw the already formatted error
        }
        
        // For network or other errors
        console.error(`[MetaService] Error getting campaign status:`, error);
        if (retries >= maxRetries) {
          throw new Error(`failed after ${retries} retries: ${error.message}`);
        }
        
        retries++;
        await delay(backoff);
        backoff *= 2;
      }
    }
    
    throw new Error(`Maximum retries (${maxRetries}) exceeded`);
  }
} 
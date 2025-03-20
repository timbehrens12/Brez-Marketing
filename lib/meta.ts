interface MetaConnection {
  id: string;
  brandId: string;
  accessToken?: string;
  accessTokenEncrypted?: string;
  active: boolean;
  adAccountId?: string;
}

interface MetaApiConfig {
  adAccountId?: string;
  startDate: string;
  endDate: string;
  fields: string[];
}

export class MetaApiClient {
  private accessToken: string;
  private adAccountId?: string;
  private apiVersion = 'v19.0';  // Meta API version

  constructor(accessToken: string, adAccountId?: string) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
  }

  /**
   * Get list of ad accounts available for the user
   */
  async getAdAccounts() {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/me/adaccounts?fields=id,name,account_status&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data.map((account: any) => ({
        id: account.id,
        name: account.name,
        status: account.account_status,
      }));
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      return null;
    }
  }

  /**
   * Get campaigns for a specific ad account
   */
  async getCampaigns(config: MetaApiConfig) {
    try {
      const adAccountId = config.adAccountId || this.adAccountId;
      
      if (!adAccountId) {
        throw new Error('Ad account ID is required');
      }

      const fields = config.fields.join(',');
      const timeRange = `{"since":"${config.startDate}","until":"${config.endDate}"}`;
      
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/${adAccountId}/insights?` +
        `fields=campaign_name,${fields}&` +
        `time_range=${encodeURIComponent(timeRange)}&` +
        `level=campaign&access_token=${this.accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API error: ${error.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return { data: [] };
    }
  }
}

/**
 * Initialize Meta API client from connection details
 */
export async function getMetaApi(connection: MetaConnection): Promise<MetaApiClient | null> {
  try {
    if (!connection.active) {
      console.error('Meta connection is not active');
      return null;
    }

    // Use the access token directly, ignoring encryption for now
    // In a real app, you would decrypt the token if it's encrypted
    const accessToken = connection.accessToken || '';
    
    if (!accessToken) {
      console.error('No access token available in Meta connection');
      return null;
    }

    return new MetaApiClient(accessToken, connection.adAccountId);
  } catch (error) {
    console.error('Error initializing Meta API:', error);
    return null;
  }
} 
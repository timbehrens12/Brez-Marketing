// No import needed

interface ShopifyConnection {
  id: string;
  brandId: string;
  shopName?: string;
  accessToken?: string;
  active: boolean;
}

/**
 * Basic Shopify API client
 */
export class ShopifyApiClient {
  private shopName: string;
  private accessToken: string;
  private apiVersion = '2023-10';

  constructor(shopName: string, accessToken: string) {
    this.shopName = shopName;
    this.accessToken = accessToken;
  }

  /**
   * Make a GraphQL query to Shopify Admin API
   */
  async query({ data }: { data: { query: string; variables?: Record<string, any> } }) {
    try {
      const response = await fetch(
        `https://${this.shopName}/admin/api/${this.apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.accessToken,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${errorText}`);
      }

      const result = await response.json();
      return { body: result };
    } catch (error) {
      console.error('Error making Shopify GraphQL query:', error);
      return { body: null };
    }
  }

  /**
   * Make a REST API request to Shopify Admin API
   */
  async request({
    path,
    method = 'GET',
    data,
  }: {
    path: string;
    method?: string;
    data?: any;
  }) {
    try {
      const url = `https://${this.shopName}/admin/api/${this.apiVersion}/${path}.json`;
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${errorText}`);
      }

      const result = await response.json();
      return { body: result };
    } catch (error) {
      console.error('Error making Shopify REST request:', error);
      return { body: null };
    }
  }
}

/**
 * Initialize Shopify API client from connection details
 */
export async function getShopifyApi(connection: ShopifyConnection) {
  try {
    if (!connection.active) {
      console.error('Shopify connection is not active');
      return null;
    }

    if (!connection.shopName || !connection.accessToken) {
      console.error('Missing shop name or access token in Shopify connection');
      return null;
    }

    return new ShopifyApiClient(connection.shopName, connection.accessToken);
  } catch (error) {
    console.error('Error initializing Shopify API:', error);
    return null;
  }
} 
declare module 'facebook-nodejs-business-sdk' {
  export class FacebookAdsApi {
    static init(accessToken: string): void;
  }

  export class AdAccount {
    constructor(id: string);
    getAdAccounts(fields: string[]): Promise<any[]>;
    getCampaigns(fields: string[]): Promise<any[]>;
  }

  export class Campaign {
    constructor(id: string);
    get(fields: string[]): Promise<any>;
  }
} 
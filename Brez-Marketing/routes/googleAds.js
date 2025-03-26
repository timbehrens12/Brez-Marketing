import express from 'express';
import { GoogleAdsApi } from 'google-ads-api';

const router = express.Router();

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

router.get('/campaigns', async (req, res) => {
  try {
    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const campaigns = await customer.report({
      entity: 'campaign',
      attributes: ['campaign.id', 'campaign.name', 'campaign.status'],
      metrics: ['metrics.impressions', 'metrics.clicks', 'metrics.cost_micros'],
      constraints: {
        'campaign.status': 'ENABLED',
      },
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching Google Ads data:', error);
    res.status(500).json({ error: 'Failed to fetch Google Ads data' });
  }
});

export const googleAdsRouter = router;


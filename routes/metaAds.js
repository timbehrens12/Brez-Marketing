import express from 'express';
import { FacebookAdsApi, AdAccount } from 'facebook-nodejs-business-sdk';

const router = express.Router();

FacebookAdsApi.init(process.env.FACEBOOK_ACCESS_TOKEN);

router.get('/performance', async (req, res) => {
  try {
    const account = new AdAccount(process.env.FACEBOOK_AD_ACCOUNT_ID);
    const insights = await account.getInsights(
      ['impressions', 'clicks', 'spend'],
      {
        time_range: {'since': '2023-01-01', 'until': '2023-12-31'},
        level: 'account',
      }
    );

    res.json(insights);
  } catch (error) {
    console.error('Error fetching Meta Ads data:', error);
    res.status(500).json({ error: 'Failed to fetch Meta Ads data' });
  }
});

export const metaAdsRouter = router;


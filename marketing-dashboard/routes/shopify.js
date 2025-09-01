import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/sales', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.SHOPIFY_API_URL}/admin/api/2023-04/orders.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Shopify data:', error);
    res.status(500).json({ error: 'Failed to fetch Shopify data' });
  }
});

export const shopifyRouter = router;


const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get('/api/auth/meta/callback', async (req, res) => {
  const { code, state, error } = req.query;

  console.log('Callback received:', { code, state, error });

  if (error) {
    console.error('Meta auth error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/settings?error=meta_auth_failed`);
  }

  if (!code || !state) {
    console.error('Missing code or state:', { code, state });
    return res.redirect(`${process.env.FRONTEND_URL}/settings?error=invalid_callback`);
  }

  try {
    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', process.env.META_APP_ID);
    tokenUrl.searchParams.append('client_secret', process.env.META_APP_SECRET);
    tokenUrl.searchParams.append('code', code);
    tokenUrl.searchParams.append('redirect_uri', `${process.env.API_URL}/api/auth/meta/callback`);

    console.log('Requesting token with URL:', tokenUrl.toString());

    const tokenResponse = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token response not ok:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText
      });
      throw new Error(`Token response not ok: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenData);

    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      throw new Error('No access token received');
    }

    // Store the connection in database
    const { error: dbError } = await supabase
      .from('platform_connections')
      .insert([{
        brand_id: state,
        platform_type: 'meta',
        access_token: tokenData.access_token,
        connected_at: new Date().toISOString(),
        status: 'active'
      }]);

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return res.redirect(`${process.env.FRONTEND_URL}/settings?success=meta_connected`);
  } catch (error) {
    console.error('Error in Meta callback:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/settings?error=meta_connection_failed`);
  }
});

module.exports = router; 
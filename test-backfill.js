const https = require('https');

const data = JSON.stringify({
  brandId: '1a30f34b-b048-4f80-b880-6c61bd12c720'
});

const options = {
  hostname: 'www.brezmarketingdashboard.com',
  port: 443,
  path: '/api/meta/backfill-campaign-stats',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('Raw response:', responseData);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(data);
req.end();

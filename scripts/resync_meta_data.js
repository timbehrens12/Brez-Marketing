/**
 * Script to resync Meta data for a specific brand and date range
 * This will help update the database with the latest campaign views
 * 
 * Usage:
 * node scripts/resync_meta_data.js --brand-id YOUR_BRAND_ID [--days 30]
 */

const https = require('https');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
let brandId = '';
let days = 30;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--brand-id' && i + 1 < args.length) {
    brandId = args[i + 1];
    i++;
  } else if (args[i] === '--days' && i + 1 < args.length) {
    days = parseInt(args[i + 1], 10);
    i++;
  }
}

if (!brandId) {
  console.error('Error: --brand-id is required');
  console.error('Usage: node scripts/resync_meta_data.js --brand-id YOUR_BRAND_ID [--days 30]');
  process.exit(1);
}

// Calculate date range
const endDate = new Date();
const startDate = new Date();
startDate.setDate(endDate.getDate() - days);

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startDateStr = formatDate(startDate);
const endDateStr = formatDate(endDate);

console.log(`Resyncing Meta data for brand ID: ${brandId}`);
console.log(`Date range: ${startDateStr} to ${endDateStr}`);

// Prepare the request data
const data = JSON.stringify({
  brandId: brandId,
  startDate: startDateStr,
  endDate: endDateStr
});

// Set up the request options
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/platforms/meta/resync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

// Make the API request
const req = http.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse from API:');
    try {
      const parsedData = JSON.parse(responseData);
      console.log(JSON.stringify(parsedData, null, 2));
    } catch (e) {
      console.log(responseData);
    }
    
    console.log('\nResync request sent! Check your dashboard in a few minutes to see updated view data.');
    console.log('If the views are still not showing, make sure your Meta campaigns include video content that can generate views.');
  });
});

req.on('error', (error) => {
  console.error('\nError sending resync request:', error.message);
  console.log('Make sure your application is running on localhost:3000');
});

req.write(data);
req.end(); 
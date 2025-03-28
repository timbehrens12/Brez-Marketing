/**
 * Meta Campaign Views Fix Script
 * 
 * This script helps fix issues with Meta campaign views:
 * 1. Cleans up duplicate views columns in the database
 * 2. Ensures the correct data structure for campaign views
 * 3. Resyncs Meta data to get fresh campaign metrics
 * 
 * Usage:
 * node scripts/fix_meta_views.js --brand-id YOUR_BRAND_ID [--days 30]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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
  console.error('Usage: node scripts/fix_meta_views.js --brand-id YOUR_BRAND_ID [--days 30]');
  process.exit(1);
}

console.log('Meta Video Views Fix Script');
console.log('==========================');

// Step 1: Check for and run the SQL fix script
console.log('\nStep 1: Fixing database structure...');

// Get database connection string from environment
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: Database URL not found in environment variables.');
  console.error('Please set SUPABASE_DB_URL or DATABASE_URL environment variable.');
  process.exit(1);
}

try {
  // Path to the SQL script
  const sqlScriptPath = path.join(__dirname, 'fix_meta_views.sql');
  
  if (fs.existsSync(sqlScriptPath)) {
    console.log('Running SQL script to fix database structure...');
    
    // Run the SQL script
    let command;
    if (process.platform === 'win32') {
      // Windows
      command = `psql "${dbUrl}" -f "${sqlScriptPath}"`;
    } else {
      // Unix/Linux/MacOS
      command = `psql '${dbUrl}' -f '${sqlScriptPath}'`;
    }
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log('Database structure fixed successfully.');
    } catch (error) {
      console.error('Error running SQL script:', error.message);
      console.error('You may need to run the SQL script manually:');
      console.error(`psql ${dbUrl} -f ${sqlScriptPath}`);
    }
  } else {
    console.error(`SQL script not found at ${sqlScriptPath}`);
    console.error('Please ensure the fix_meta_views.sql script exists in the scripts directory.');
  }
} catch (error) {
  console.error('Error checking for SQL script:', error.message);
}

// Step 2: Resync Meta data to get fresh video views
console.log('\nStep 2: Resyncing Meta data to get fresh video views...');

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
      
      console.log('\nMeta data resync initiated!');
      console.log('Please check your dashboard in a few minutes to see updated campaign views data.');
      console.log('\nImportant notes:');
      console.log('1. Views data comes directly from your Meta campaigns');
      console.log('2. The views metric represents the number of campaign views');
      console.log('3. If your campaigns are new or have low traffic, this metric may show 0');
    } catch (e) {
      console.log(responseData);
    }
    
    console.log('\nTroubleshooting:');
    console.log('If you still see duplicate Views widgets or 0 views:');
    console.log('1. Restart your development server');
    console.log('2. Check your developer console for any errors');
    console.log('3. Make sure your Meta campaigns are active and have enough impressions');
  });
});

req.on('error', (error) => {
  console.error('\nError sending resync request:', error.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure your application is running on localhost:3000');
  console.log('2. Try resyncing data directly from your dashboard');
  console.log('3. Check your Meta campaign settings to ensure they are active and getting impressions');
});

req.write(data);
req.end(); 
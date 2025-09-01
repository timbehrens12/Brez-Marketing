// This script creates the shopify_inventory table in Supabase
// Run with: node scripts/create-inventory-table.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createInventoryTable() {
  try {
    console.log('Creating shopify_inventory table...');
    
    // Read the SQL file from the scripts directory
    const sqlPath = path.join(__dirname, 'create-inventory-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      throw error;
    }
    
    console.log('shopify_inventory table created successfully!');
    
    // Check if the table exists
    const { data, error: tableError } = await supabase
      .from('shopify_inventory')
      .select('count(*)', { count: 'exact', head: true });
    
    if (tableError) {
      console.warn('Table created but could not verify:', tableError.message);
    } else {
      console.log('Table verified. Current row count:', data);
    }
    
  } catch (error) {
    console.error('Error creating shopify_inventory table:', error);
    console.error('Error details:', error.message);
  }
}

createInventoryTable(); 
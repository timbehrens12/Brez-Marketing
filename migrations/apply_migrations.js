// Migration script to apply database changes
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get the migration file as a command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Please specify a migration file to apply');
  console.error('Usage: node apply_migrations.js <migration-file>');
  process.exit(1);
}

const filePath = path.resolve(__dirname, migrationFile);

if (!fs.existsSync(filePath)) {
  console.error(`Migration file not found: ${filePath}`);
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log(`Applying migration: ${migrationFile}`);
    
    // Read the migration SQL
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }
    
    console.log(`Migration applied successfully: ${migrationFile}`);
    
    // Record the migration in the migrations table
    const { error: recordError } = await supabase
      .from('migrations')
      .insert({
        name: path.basename(migrationFile),
        applied_at: new Date().toISOString()
      });
    
    if (recordError) {
      console.error('Error recording migration:', recordError);
    }
    
  } catch (error) {
    console.error('Error in migration process:', error);
    process.exit(1);
  }
}

applyMigration(); 
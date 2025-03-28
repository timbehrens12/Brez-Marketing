#!/bin/bash
# Comprehensive diagnostics for Meta data issues

echo "------------------------------------------------------"
echo "Meta Data Diagnostics"
echo "------------------------------------------------------"
echo "This script will check for common issues with Meta data"
echo "and help troubleshoot database connectivity problems."
echo ""

# Default port to check
PORT=3001

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "WARNING: SUPABASE_DB_URL environment variable is not set."
  echo "Database checks will be skipped."
  echo "To enable database checks, set SUPABASE_DB_URL:"
  echo "Example: export SUPABASE_DB_URL=postgresql://postgres:password@localhost:5432/postgres"
  echo ""
else
  echo "Testing database connection..."
  if psql $SUPABASE_DB_URL -c "SELECT 1;" &>/dev/null; then
    echo "✓ Database connection successful"
    
    # Check if meta_ad_insights table exists
    TABLE_EXISTS=$(psql $SUPABASE_DB_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meta_ad_insights');")
    
    if [[ $TABLE_EXISTS == *"t"* ]]; then
      echo "✓ meta_ad_insights table exists"
      
      # Check for views column
      VIEWS_COLUMN_EXISTS=$(psql $SUPABASE_DB_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meta_ad_insights' AND column_name = 'views');")
      
      if [[ $VIEWS_COLUMN_EXISTS == *"t"* ]]; then
        echo "✓ views column exists in meta_ad_insights table"
      else
        echo "✗ views column MISSING in meta_ad_insights table"
        echo "  Run the following to add the views column:"
        echo "  psql $SUPABASE_DB_URL -f scripts/add_meta_views_column.sql"
      fi
      
      # Check record count
      RECORD_COUNT=$(psql $SUPABASE_DB_URL -t -c "SELECT COUNT(*) FROM meta_ad_insights;")
      echo "  Total records in meta_ad_insights: $RECORD_COUNT"
      
      # Check if any records have views data
      VIEWS_COUNT=$(psql $SUPABASE_DB_URL -t -c "SELECT COUNT(*) FROM meta_ad_insights WHERE views > 0;")
      echo "  Records with views data: $VIEWS_COUNT"
    else
      echo "✗ meta_ad_insights table MISSING"
      echo "  Run the following to create the table:"
      echo "  psql $SUPABASE_DB_URL -f scripts/create-meta-ad-insights-table.sql"
    fi
    
    # Check if utility functions exist
    CHECK_TABLE_FUNC_EXISTS=$(psql $SUPABASE_DB_URL -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'check_table_exists');")
    LIST_COLUMNS_FUNC_EXISTS=$(psql $SUPABASE_DB_URL -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'list_table_columns');")
    
    if [[ $CHECK_TABLE_FUNC_EXISTS == *"t"* && $LIST_COLUMNS_FUNC_EXISTS == *"t"* ]]; then
      echo "✓ Database utility functions exist"
    else
      echo "✗ Database utility functions MISSING"
      echo "  Run the following to add the utility functions:"
      echo "  psql $SUPABASE_DB_URL -f scripts/add_db_helper_functions.sql"
    fi
  else
    echo "✗ Database connection FAILED"
    echo "  Check your database credentials and ensure the database is running."
  fi
fi

echo ""
echo "Testing API connectivity..."

# Check if server is running at port 3000
if curl -s http://localhost:3000 > /dev/null; then
  echo "✓ Server running at port 3000"
  PORT=3000
elif curl -s http://localhost:3001 > /dev/null; then
  echo "✓ Server running at port 3001"
  PORT=3001
else
  echo "✗ Server not detected at port 3000 or 3001"
  echo "  Start your server with: npm run dev"
  echo ""
  echo "Diagnostics completed with errors."
  exit 1
fi

# Try to access the debug endpoint
echo "Testing Meta diagnostics API..."
RESPONSE=$(curl -s "http://localhost:$PORT/api/admin/debug-meta-db?token=debug-meta-data" || echo "Connection failed")

if [[ $RESPONSE == *"Connection failed"* ]]; then
  echo "✗ Failed to connect to debug API"
else
  if [[ $RESPONSE == *"error"* ]]; then
    echo "✗ Debug API returned an error: $RESPONSE"
  else
    echo "✓ Debug API working correctly"
  fi
fi

echo ""
echo "Next steps:"
echo "1. Open the Meta fix page at: http://localhost:$PORT/admin/meta-fix"
echo "2. Run the database diagnostics for more details"
echo "3. After fixing issues, resync your Meta data"
echo "------------------------------------------------------" 
#!/bin/bash
# Script to run the SQL migration for adding the views column to meta_ad_insights table

echo "------------------------------------------------------"
echo "Meta Views Column Migration Script"
echo "------------------------------------------------------"
echo "This script will add a 'views' column to meta_ad_insights table"
echo "and populate it with data from the reach column."
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL environment variable is not set."
  echo "Please set it before running this script."
  echo "Example: export SUPABASE_DB_URL=postgresql://postgres:password@localhost:5432/postgres"
  exit 1
fi

echo "Step 1: Adding check_column_exists function..."
psql $SUPABASE_DB_URL -f scripts/add_check_column_function.sql

echo "Step 2: Running views column migration..."
# Run the SQL script
psql $SUPABASE_DB_URL -f scripts/add_meta_views_column.sql

echo ""
echo "Migration completed."
echo ""
echo "Next steps:"
echo "1. Build and deploy your application with the updated Meta service"
echo "2. Resync Meta data using the admin dashboard at /admin/meta-fix"
echo "3. Verify that views data appears correctly in the dashboard"
echo "------------------------------------------------------" 
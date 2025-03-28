#!/bin/bash
# Script to fix Meta views by adding the views column and updating data

# Set database URL from environment or ask user
if [ -z "$SUPABASE_DB_URL" ]; then
  read -p "Enter your database connection URL: " SUPABASE_DB_URL
fi

echo "===== Fixing Meta Views ====="
echo "1. Adding views column to meta_ad_insights table"
psql $SUPABASE_DB_URL -f scripts/add_meta_views_column.sql

echo "2. Creating utility functions"
psql $SUPABASE_DB_URL -f scripts/create_meta_utility_functions.sql

echo "3. Creating update function"
psql $SUPABASE_DB_URL -f scripts/create_update_views_function.sql

echo "4. Updating existing records"
psql $SUPABASE_DB_URL -f scripts/update_meta_views_data.sql

echo "===== Fix Complete ====="
echo "The Meta views column has been added and populated from reach data."
echo "To complete the fix, restart your server and resync Meta data in the dashboard."
echo "You can also run the admin Meta fix page at /admin/meta-fix" 
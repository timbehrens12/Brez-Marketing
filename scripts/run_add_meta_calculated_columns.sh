#!/bin/bash

# Run the SQL script to add calculated columns to meta_ad_insights table

# Get database connection details from environment or Supabase config
if [ -z "$SUPABASE_DB_URL" ]; then
  # Try to get from supabase CLI if available
  if command -v supabase &> /dev/null; then
    echo "Getting database URL from Supabase..."
    SUPABASE_DB_URL=$(supabase db connection-string)
  else
    echo "Error: SUPABASE_DB_URL environment variable not set and supabase CLI not found."
    echo "Please set SUPABASE_DB_URL or install the Supabase CLI."
    exit 1
  fi
fi

echo "Adding calculated columns to meta_ad_insights table..."
echo "Using SQL file: ./scripts/add_meta_calculated_columns.sql"

# Execute the SQL file using psql
if [ -n "$SUPABASE_DB_URL" ]; then
  psql "$SUPABASE_DB_URL" -f ./scripts/add_meta_calculated_columns.sql
else
  echo "Error: Could not determine database connection string."
  exit 1
fi

echo "Done!" 
#!/bin/bash

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

echo "Fixing Meta tables and functions..."

# Run the SQL files
echo "1. Adding last_budget_refresh column to meta_campaigns table..."
if [ -n "$SUPABASE_DB_URL" ]; then
  psql "$SUPABASE_DB_URL" -f ./scripts/meta/add_last_budget_refresh_column.sql
else
  echo "Error: Could not determine database connection string."
  exit 1
fi

echo "2. Creating get_campaign_insights_by_date_range function..."
if [ -n "$SUPABASE_DB_URL" ]; then
  psql "$SUPABASE_DB_URL" -f ./scripts/meta/daily_campaign_insights.sql
else
  echo "Error: Could not determine database connection string."
  exit 1
fi

echo "Meta fixes completed successfully!" 
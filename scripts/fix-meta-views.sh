#!/bin/bash
# Script to resync Meta data to fix Views widget

# Default values
BRAND_ID=""
DAYS=30
PORT=3001

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --brand-id)
      BRAND_ID="$2"
      shift 2
      ;;
    --days)
      DAYS="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if brand ID is provided
if [ -z "$BRAND_ID" ]; then
  echo "Error: --brand-id is required"
  echo "Usage: ./fix-meta-views.sh --brand-id <brand_id> [--days <number_of_days>] [--port <port>]"
  exit 1
fi

# Auto-detect server port if running
if [[ -z "$PORT" ]]; then
  if curl -s http://localhost:3000 >/dev/null 2>&1; then
    PORT=3000
    echo "Detected server running on port 3000"
  elif curl -s http://localhost:3001 >/dev/null 2>&1; then
    PORT=3001
    echo "Detected server running on port 3001"
  else
    echo "Warning: Could not detect server port. Using default port 3001."
    echo "If your server is running on a different port, use --port option."
    PORT=3001
  fi
fi

# Calculate date range
END_DATE=$(date +"%Y-%m-%d")
START_DATE=$(date -d "$END_DATE -$DAYS days" +"%Y-%m-%d")

echo "Resyncing Meta data for brand ID: $BRAND_ID"
echo "Date range: $START_DATE to $END_DATE"
echo "Server port: $PORT"

# First, check database for views column
if [ ! -z "$SUPABASE_DB_URL" ]; then
  echo "Checking database for views column..."
  VIEWS_COLUMN_EXISTS=$(psql $SUPABASE_DB_URL -t -c "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'meta_ad_insights' AND column_name = 'views');" 2>/dev/null)
  
  if [[ $VIEWS_COLUMN_EXISTS == *"t"* ]]; then
    echo "✓ views column exists in meta_ad_insights table"
  else
    echo "✗ views column MISSING in meta_ad_insights table"
    echo "  Running SQL script to add views column..."
    psql $SUPABASE_DB_URL -f scripts/add_meta_views_column.sql
  fi
else
  echo "SUPABASE_DB_URL not set, skipping database check."
  echo "If you haven't already, please run: scripts/add_meta_views_column.sql"
fi

# Make API request to resync Meta data
echo "Sending resync request to API..."
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"brandId\":\"$BRAND_ID\",\"startDate\":\"$START_DATE\",\"endDate\":\"$END_DATE\"}" \
  "http://localhost:$PORT/api/admin/resync-meta?token=fix-meta-data")

echo ""
if [[ $RESPONSE == *"success"* ]]; then
  echo "✓ Resync request sent successfully. Response: $RESPONSE"
else
  echo "✗ Error sending resync request. Response: $RESPONSE"
fi

echo ""
echo "Next steps:"
echo "1. Check your dashboard to see if Views data is now showing"
echo "2. Visit http://localhost:$PORT/admin/meta-fix for more diagnostics"
echo "3. If issues persist, run scripts/diagnose-meta-issues.sh for detailed diagnostics" 
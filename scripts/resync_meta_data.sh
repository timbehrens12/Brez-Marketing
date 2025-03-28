#!/bin/bash

# This script helps resync Meta data for a specific brand and date range

# Default values
BRAND_ID=""
DAYS=30  # Default to last 30 days

# Parse command-line arguments
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
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --brand-id BRAND_ID [--days DAYS]"
      exit 1
      ;;
  esac
done

# Check if brand_id is provided
if [ -z "$BRAND_ID" ]; then
  echo "Error: --brand-id is required"
  echo "Usage: $0 --brand-id BRAND_ID [--days DAYS]"
  exit 1
fi

# Calculate date range
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "$END_DATE -$DAYS days" +%Y-%m-%d)

echo "Resyncing Meta data for brand ID: $BRAND_ID"
echo "Date range: $START_DATE to $END_DATE"

# Make the API request to resync the data
curl -X POST "http://localhost:3000/api/platforms/meta/resync" \
  -H "Content-Type: application/json" \
  -d "{
    \"brandId\": \"$BRAND_ID\",
    \"startDate\": \"$START_DATE\",
    \"endDate\": \"$END_DATE\"
  }"

echo ""
echo "Resync request sent! Check your dashboard in a few minutes to see updated view data."
echo "If the views are still not showing, make sure your Meta campaigns include video content that can generate views." 
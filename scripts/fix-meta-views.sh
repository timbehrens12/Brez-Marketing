#!/bin/bash
# Script to resync Meta data to fix Views widget

# Default values
BRAND_ID=""
DAYS=30

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
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if brand ID is provided
if [ -z "$BRAND_ID" ]; then
  echo "Error: --brand-id is required"
  echo "Usage: ./fix-meta-views.sh --brand-id <brand_id> [--days <number_of_days>]"
  exit 1
fi

# Calculate date range
END_DATE=$(date +"%Y-%m-%d")
START_DATE=$(date -d "$END_DATE -$DAYS days" +"%Y-%m-%d")

echo "Resyncing Meta data for brand ID: $BRAND_ID"
echo "Date range: $START_DATE to $END_DATE"

# Make API request to resync Meta data
curl -X POST \
  -H "Content-Type: application/json" \
  -d "{\"brandId\":\"$BRAND_ID\",\"startDate\":\"$START_DATE\",\"endDate\":\"$END_DATE\"}" \
  "http://localhost:3000/api/admin/resync-meta?token=fix-meta-data"

echo ""
echo "Resync request sent. Please check your dashboard in a few minutes to see if Views data is now showing."
echo "You can also visit http://localhost:3000/admin/meta-fix to check the status of the resync." 
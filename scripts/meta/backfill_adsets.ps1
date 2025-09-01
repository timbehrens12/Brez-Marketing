# PowerShell script for Windows systems to backfill Meta ad sets
# Run with: powershell -File .\scripts\meta\backfill_adsets.ps1 <brand_id>

param (
    [Parameter(Mandatory=$true)]
    [string]$BrandId
)

# Check if environment variables are set
if (-not $env:DB_HOST -or -not $env:DB_USER -or -not $env:DB_NAME) {
    Write-Host "Environment variables DB_HOST, DB_USER, and DB_NAME must be set"
    Write-Host "Example: $env:DB_HOST='localhost'; $env:DB_USER='postgres'; $env:DB_NAME='mydb'; .\scripts\meta\backfill_adsets.ps1 <brand_id>"
    exit 1
}

# Create temporary SQL file
$scriptPath = "backfill_script.sql"

# Write SQL commands to script file
@"
-- Get date range for campaigns
SELECT * FROM get_campaign_date_range('$BrandId');

-- Run backfill function
SELECT backfill_adset_data_for_brand('$BrandId');

-- Sync campaign budgets
SELECT sync_all_campaign_adset_budgets();
"@ | Out-File -FilePath $scriptPath -Encoding UTF8

Write-Host "Running backfill for brand $BrandId..."

# Execute SQL script with psql
try {
    & psql -h $env:DB_HOST -U $env:DB_USER -d $env:DB_NAME -f $scriptPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error executing SQL script. Check if psql is in your PATH and credentials are correct."
        exit 1
    }
} catch {
    Write-Host "Failed to execute psql: $_"
    exit 1
}

# Clean up
Remove-Item -Path $scriptPath -Force

Write-Host "Backfill complete. Now use the API to fetch ad sets with the date range displayed above."
Write-Host "Example API call: /api/meta/adsets?brandId=$BrandId&campaignId=<campaign_id>&from=<min_date>&to=<max_date>&forceRefresh=true"
Write-Host "Done!" 
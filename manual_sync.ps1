# MANUAL SYNC SCRIPT - Execute these commands in order
Write-Host "🔥 MANUAL SYNC - STEP BY STEP" -ForegroundColor Red
Write-Host "=================================" -ForegroundColor Yellow

Write-Host "`nStep 1: Force Orders Fetch..." -ForegroundColor Cyan
# Visit: https://www.brezmarketingdashboard.com/api/shopify/analytics/repeat-customers
Write-Host "Go to: https://www.brezmarketingdashboard.com/api/shopify/analytics/repeat-customers" -ForegroundColor White
Read-Host "Press Enter after visiting this URL"

Write-Host "`nStep 2: Force Customers Fetch..." -ForegroundColor Cyan
# Visit: https://www.brezmarketingdashboard.com/api/shopify/analytics/customer-segments
Write-Host "Go to: https://www.brezmarketingdashboard.com/api/shopify/analytics/customer-segments" -ForegroundColor White
Read-Host "Press Enter after visiting this URL"

Write-Host "`nStep 3: Force Products/Inventory Fetch..." -ForegroundColor Cyan
# Visit: https://www.brezmarketingdashboard.com/api/shopify/inventory
Write-Host "Go to: https://www.brezmarketingdashboard.com/api/shopify/inventory" -ForegroundColor White
Read-Host "Press Enter after visiting this URL"

Write-Host "`nStep 4: Trigger Full Sync..." -ForegroundColor Cyan
# Visit: https://www.brezmarketingdashboard.com/api/shopify/sync
Write-Host "Go to: https://www.brezmarketingdashboard.com/api/shopify/sync" -ForegroundColor White
Read-Host "Press Enter after visiting this URL"

Write-Host "`nStep 5: Check Dashboard..." -ForegroundColor Green
Write-Host "Go back to your dashboard and check:" -ForegroundColor White
Write-Host "  - Orders: Should show real numbers" -ForegroundColor White
Write-Host "  - Inventory: Should not be 0s" -ForegroundColor White
Write-Host "  - Customers: Should have data" -ForegroundColor White

Write-Host "`n✅ If this works, the direct API calls are functioning!" -ForegroundColor Green
Write-Host "❌ If this fails, we know the issue is in the API endpoints themselves" -ForegroundColor Red

Read-Host "`nPress Enter to finish"

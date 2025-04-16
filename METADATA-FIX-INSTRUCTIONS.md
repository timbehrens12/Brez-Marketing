# Instructions for Fixing Campaign Status Refresh in MetaTab.tsx

## Problem

Your campaign widget is not automatically refreshing when campaign statuses change. Additionally, there are linter errors related to duplicate declarations of `refreshAllMetricsDirectlyRef`.

## Manual Fix Instructions

Follow these steps to fix the issues:

1. Open the file `components/dashboard/platforms/tabs/MetaTab.tsx` in your editor
2. Locate and **DELETE** this duplicate code section starting around line 4258:
   ```tsx
   // Store a stable reference to the refresh function
   const refreshAllMetricsDirectlyRef = useRef(refreshAllMetricsDirectly);

   // Update the ref when the function changes
   useEffect(() => {
     refreshAllMetricsDirectlyRef.current = refreshAllMetricsDirectly;
   }, [refreshAllMetricsDirectly]);
   ```

3. After deleting the duplicate code, add the campaign status polling function from the `campaign-status-polling.js` file.
4. Add this function right after the `refreshAllMetaData` function (before the `return` statement).

## Campaign Status Polling Function

The new polling function checks campaign statuses every 30 seconds and updates the UI when it detects changes. It:

1. Checks up to 10 campaigns at a time to avoid rate limits
2. Prioritizes recently changed campaigns and paused campaigns
3. Shows a notification when status changes are detected
4. Refreshes the UI automatically

This implementation will ensure:
- Campaign statuses update in real-time 
- AdSet changes are reflected promptly
- Status changes show a notification to keep users informed

## Troubleshooting

If you encounter any issues after adding the new code:

1. Check for any remaining duplicate variable definitions
2. Verify that all brackets and parentheses are properly matched
3. Ensure that there aren't two implementations of the same function 
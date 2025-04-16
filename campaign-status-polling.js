// Add this function after the refreshAllMetaData function in MetaTab.tsx
// Make sure not to duplicate any existing refreshAllMetricsDirectlyRef variable

// Add a dedicated campaign status polling function that continuously checks for status changes
const pollCampaignStatuses = useCallback(async () => {
  if (!brandId || !campaigns || campaigns.length === 0) return;
  
  // Generate a unique fetch ID for this status check operation
  const fetchId = `status-check-${Date.now()}`;
  
  // Don't run if other fetches are in progress to avoid overwhelming the API
  if (isMetaFetchInProgress()) {
    console.log(`[MetaTab] Skipping campaign status polling - another fetch already in progress`);
    return;
  }
  
  // Acquire a fetch lock for this operation
  if (!acquireMetaFetchLock(fetchId)) {
    console.log(`[MetaTab] Failed to acquire fetch lock for campaign status polling`);
    return;
  }
  
  try {
    console.log(`[MetaTab] Polling campaign statuses for ${campaigns.length} campaigns`);
    
    // Select campaigns to check - prioritize recent updates but include both active and inactive
    const campaignsToCheck = [...campaigns]
      .sort((a, b) => {
        // Prioritize:
        // 1. Campaigns that were recently modified (updated_at)
        // 2. Campaigns with status == "PAUSED" that might be activated
        // 3. Everything else
        const aUpdated = new Date(a.last_sync_date || a.updated_at || 0).getTime();
        const bUpdated = new Date(b.last_sync_date || b.updated_at || 0).getTime();
        
        // If one is paused and the other isn't, prioritize the paused one
        if (a.status?.toUpperCase() === 'PAUSED' && b.status?.toUpperCase() !== 'PAUSED') {
          return -1;
        }
        if (a.status?.toUpperCase() !== 'PAUSED' && b.status?.toUpperCase() === 'PAUSED') {
          return 1;
        }
        
        // Otherwise, sort by recency
        return bUpdated - aUpdated;
      })
      .slice(0, 10); // Check up to 10 campaigns to avoid rate limits
    
    // Map each campaign to a status check promise
    const statusPromises = campaignsToCheck.map(async (campaign) => {
      try {
        const response = await fetch('/api/meta/campaign-status-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Fetch-ID': fetchId
          },
          body: JSON.stringify({
            brandId,
            campaignId: campaign.campaign_id,
            refreshStatus: true,
            forceRefresh: true
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // Check if the status has changed from what we have locally
          if (data.success && data.status && data.status !== campaign.status) {
            console.log(`[MetaTab] 🔄 Campaign "${campaign.name}" status changed: ${campaign.status} → ${data.status}`);
            return true; // Status changed
          }
        }
        return false;
      } catch (error) {
        console.error(`[MetaTab] Error checking status for campaign ${campaign.campaign_id}:`, error);
        return false;
      }
    });
    
    // Wait for all status checks to complete
    const results = await Promise.all(statusPromises);
    const anyStatusChanged = results.some(result => result === true);
    
    // If any status changed, refresh the campaigns list to update the UI
    if (anyStatusChanged) {
      console.log(`[MetaTab] Campaign status changes detected, refreshing campaign list`);
      await fetchCampaigns(true);
      
      // Show a notification to inform the user about the status change
      toast.info("Campaign status updated", {
        description: "Campaign status has changed and the display has been updated"
      });
    }
  } catch (error) {
    console.error(`[MetaTab] Error during campaign status polling:`, error);
  } finally {
    // Always release the fetch lock
    releaseMetaFetchLock(fetchId);
  }
}, [brandId, campaigns, fetchCampaigns]);

// Set up automatic polling for campaign statuses
// Add this useEffect to set up the polling interval
useEffect(() => {
  if (!brandId || !campaigns || campaigns.length === 0) return;
  
  console.log('[MetaTab] 🔄 Setting up campaign status polling interval (30s)');
  
  // Poll campaign statuses immediately on first mount
  pollCampaignStatuses();
  
  // Poll every 30 seconds, but only if the page is visible
  const intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      pollCampaignStatuses();
    }
  }, 30000); // 30 seconds
  
  // Clean up interval on unmount
  return () => {
    clearInterval(intervalId);
    console.log('[MetaTab] 🛑 Cleared campaign status polling interval');
  };
}, [brandId, campaigns, pollCampaignStatuses]); 
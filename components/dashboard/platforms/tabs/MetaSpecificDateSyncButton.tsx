"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MetaSpecificDateSyncButtonProps {
  brandId: string;
  onComplete?: () => void;
  className?: string;
  syncDate: string; // YYYY-MM-DD format
  buttonLabel?: string;
}

export function MetaSpecificDateSyncButton({
  brandId,
  onComplete,
  className = "",
  syncDate,
  buttonLabel
}: MetaSpecificDateSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSyncDate = async () => {
    if (!brandId) {
      toast.error("No brand selected");
      return;
    }
    if (!syncDate || !/^\d{4}-\d{2}-\d{2}$/.test(syncDate)) {
      toast.error("Invalid date provided for sync. Please use YYYY-MM-DD format.");
      return;
    }

    setIsLoading(true);
    const toastId = `meta-sync-${syncDate}`;

    toast.loading(`Syncing Meta data for ${syncDate}...`, {
      id: toastId,
    });

    try {
      const response = await fetch('/api/meta/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          dateFrom: syncDate,
          dateTo: syncDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to sync data for ${syncDate}`);
      }

      toast.success(`Successfully synced Meta data for ${syncDate} (${data.count} records)`, {
        id: toastId,
      });

      // Refresh campaigns data to reflect the changes
      const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${brandId}&refresh=true&t=${Date.now()}`);
      if (!campaignsResponse.ok) {
        console.warn("Could not refresh campaigns data after sync");
      }

      if (onComplete) {
        onComplete();
      }

      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { 
          brandId, 
          timestamp: Date.now(),
          forceRefresh: true,
          backfilledDate: syncDate
        }
      }));

    } catch (error) {
      console.error(`Error syncing Meta data for ${syncDate}:`, error);
      toast.error(`Failed to sync Meta data for ${syncDate}`, {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSyncDate}
      disabled={isLoading || !brandId}
      variant="outline"
      size="sm"
      className={`${className} whitespace-nowrap flex items-center gap-2`}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      {isLoading ? "Syncing..." : buttonLabel || `Sync Data for ${syncDate}`}
    </Button>
  );
} 
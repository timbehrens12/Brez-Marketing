import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type MetaFixButtonProps = {
  brandId: string;
};

export default function MetaFixButton({ brandId }: MetaFixButtonProps) {
  const [isFixing, setIsFixing] = useState(false);

  const handleFixConnection = async () => {
    if (!brandId || isFixing) return;
    
    setIsFixing(true);
    toast("Fixing Meta connection...", {
      description: "Updating credentials to ensure proper API access."
    });
    
    try {
      const response = await fetch('/api/meta/update-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ brandId, forceUpdate: true })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fix Meta connection: ${response.status}`);
      }
      
      const data = await response.json();
      
      toast.success("Meta connection fixed!", {
        description: data.message || "Connection has been updated successfully."
      });
      
      // Give the toast time to show before reloading
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error fixing Meta connection:', error);
      toast.error("Error fixing connection", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleFixConnection} 
      disabled={isFixing}
      className="ml-2"
    >
      {isFixing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Fixing...
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" />
          Fix Connection
        </>
      )}
    </Button>
  );
} 
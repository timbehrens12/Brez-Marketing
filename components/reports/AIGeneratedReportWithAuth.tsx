import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useToast } from '@/components/ui/use-toast';
import AIGeneratedReport from './AIGeneratedReport';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { supabaseClient } from '@/lib/supabase-client';

interface AIGeneratedReportWithAuthProps {
  reportType: 'summary' | 'comprehensive' | 'basic';
  period: string;
}

const usePlatformMetrics = (period: string, userId: string | null | undefined) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Simulate loading data
    setIsLoading(true);
    
    // Simulate API call with timeout
    const timer = setTimeout(() => {
      try {
        // Sample data structure that would normally come from an API
        const sampleData = {
          currentPeriodData: {
            totalSales: 24500,
            ordersCount: 142,
            averageOrderValue: 172.53,
            conversionRate: 3.2,
            customerCount: 138,
            adSpend: 5200,
            roas: 4.71
          },
          previousPeriodData: {
            totalSales: 22100,
            ordersCount: 129,
            averageOrderValue: 171.32,
            conversionRate: 2.9,
            customerCount: 125,
            adSpend: 4900,
            roas: 4.51
          },
          bestSellingProducts: [
            { name: "Premium Package", revenue: 8750, orders: 25 },
            { name: "Standard Plan", revenue: 6300, orders: 42 },
            { name: "Basic Subscription", revenue: 4200, orders: 35 }
          ],
          shopifyConnected: true,
          metaConnected: true
        };
        
        setData(sampleData);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load metrics data');
        setIsLoading(false);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [period, userId]);

  return { data, isLoading, error };
};

// For fetching report history
const useReportHistory = (userId: string | null | undefined) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchReportHistory = async () => {
      try {
        setIsLoading(true);
        
        // Here we would normally use the user's brand ID, but for this example
        // we'll use a placeholder value
        const brandId = "1a30f34b-b048-4f80-b880-6c61bd12c720"; // placeholder

        // Fetch report history from Supabase
        const { data, error } = await supabaseClient
          .from('ai_reports')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(10);
          
        if (error) {
          console.error('Error fetching report history:', error);
          throw new Error('Failed to fetch report history');
        }
        
        setReports(data || []);
      } catch (err) {
        console.error('Error in report history:', err);
        setError('Failed to load report history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportHistory();
  }, [userId]);

  return { reports, isLoading, error };
};

const AIGeneratedReportWithAuth: React.FC<AIGeneratedReportWithAuthProps> = ({ reportType, period }) => {
  const { toast } = useToast();
  const { userId, isLoaded: isAuthLoaded } = useAuth();

  // Fetch platform metrics using the custom hook
  const { 
    data: metricsData, 
    isLoading: isMetricsLoading, 
    error: metricsError 
  } = usePlatformMetrics(period, userId);
  
  // Get report history
  const {
    reports: reportHistory,
    isLoading: isHistoryLoading,
    error: historyError
  } = useReportHistory(userId);

  useEffect(() => {
    // Log report history error if present
    if (historyError) {
      console.error('Error checking report status:', historyError);
    }
  }, [historyError]);

  if (!isAuthLoaded) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card>
        <CardContent className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              Please sign in to view reports and analysis.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (metricsError) {
    toast({
      title: "Error loading metrics",
      description: "Could not load the required metrics for the report.",
      variant: "destructive",
    });
  }

  // Handle the case where we have no metrics data yet
  const metrics = metricsData?.currentPeriodData || {
    totalSales: 0,
    ordersCount: 0,
    conversionRate: 0,
    averageOrderValue: 0,
    customerCount: 0
  };

  const comparison = metricsData?.previousPeriodData || {
    totalSales: 0,
    ordersCount: 0,
    conversionRate: 0,
    averageOrderValue: 0,
    customerCount: 0
  };

  const bestSellingProducts = metricsData?.bestSellingProducts || [];
  
  const platformData = {
    shopifyConnected: !!metricsData?.shopifyConnected,
    metaConnected: !!metricsData?.metaConnected
  };

  const dateRange = {
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  };

  return (
    <>
      {isMetricsLoading ? (
        <Card>
          <CardContent className="p-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      ) : (
        <AIGeneratedReport
          reportType={reportType}
          period={period}
          metrics={metrics}
          comparison={comparison}
          bestSellingProducts={bestSellingProducts}
          platformData={platformData}
          dateRange={dateRange}
          className="w-full"
        />
      )}
    </>
  );
};

export default AIGeneratedReportWithAuth; 
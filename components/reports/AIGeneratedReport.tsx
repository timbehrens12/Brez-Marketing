import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AIGeneratedReportProps {
  reportType: 'summary' | 'comprehensive' | 'basic';
  period: string;
  metrics: Record<string, number>;
  comparison: Record<string, number>;
  bestSellingProducts?: Array<{
    name: string;
    revenue: number;
    orders: number;
  }>;
  platformData?: {
    shopifyConnected: boolean;
    metaConnected: boolean;
  };
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  className?: string;
}

interface ReportSection {
  title: string;
  description: string;
  metrics?: string[];
}

interface ProductInsight {
  product: string;
  insight: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface ComprehensiveReport {
  executiveSummary: string;
  performanceAnalysis: ReportSection[];
  productInsights?: ProductInsight[];
  recommendations: Recommendation[];
  nextSteps: string[];
}

const AIGeneratedReport: React.FC<AIGeneratedReportProps> = ({
  reportType,
  period,
  metrics,
  comparison,
  bestSellingProducts = [],
  platformData = { shopifyConnected: false, metaConnected: false },
  dateRange = {},
  className,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<string | ComprehensiveReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          period,
          metrics,
          comparison,
          bestSellingProducts,
          platformData,
          dateRange,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      console.error('Error fetching AI report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReport();
  };

  const handleDownload = () => {
    if (!report) return;
    
    const reportText = typeof report === 'string' 
      ? report 
      : JSON.stringify(report, null, 2);
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${period}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, period]);

  const renderPriorityBadge = (priority: string) => {
    const colorMap = {
      'High': 'destructive',
      'Medium': 'default',
      'Low': 'secondary'
    };
    const color = colorMap[priority as keyof typeof colorMap] || 'default';
    
    return <Badge variant={color as any}>{priority}</Badge>;
  };

  const renderComprehensiveReport = (report: ComprehensiveReport) => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Executive Summary</h3>
          <p className="mt-2 text-sm text-gray-600">{report.executiveSummary}</p>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Performance Analysis</h3>
          <div className="mt-2 space-y-4">
            {report.performanceAnalysis.map((section, index) => (
              <div key={index} className="border rounded-md p-4">
                <h4 className="font-medium">{section.title}</h4>
                <p className="mt-1 text-sm text-gray-600">{section.description}</p>
                {section.metrics && section.metrics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {section.metrics.map((metric, i) => (
                      <Badge key={i} variant="outline">{metric}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {report.productInsights && report.productInsights.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold">Product Insights</h3>
            <div className="mt-2 space-y-3">
              {report.productInsights.map((insight, index) => (
                <div key={index} className="border rounded-md p-3">
                  <h4 className="font-medium">{insight.product}</h4>
                  <p className="text-sm text-gray-600">{insight.insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold">Recommendations</h3>
          <div className="mt-2 space-y-4">
            {report.recommendations.map((rec, index) => (
              <div key={index} className="border rounded-md p-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{rec.title}</h4>
                  {renderPriorityBadge(rec.priority)}
                </div>
                <p className="mt-1 text-sm text-gray-600">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Next Steps</h3>
          <ul className="mt-2 list-disc list-inside space-y-1">
            {report.nextSteps.map((step, index) => (
              <li key={index} className="text-sm text-gray-600">{step}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderSimpleReport = (report: string) => {
    // For simple reports, we try to enhance the display by parsing sections
    const sections = report.split(/\n\n|\r\n\r\n/);
    
    return (
      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="space-y-2">
            {section.split(/\n|\r\n/).map((line, lineIdx) => {
              // Check if the line appears to be a header
              if (line.includes(':') && line.length < 50) {
                const [title, ...rest] = line.split(':');
                return (
                  <div key={lineIdx}>
                    <h3 className="text-md font-semibold">{title}:</h3>
                    <p className="text-sm text-gray-600">{rest.join(':')}</p>
                  </div>
                );
              }
              
              // Check if the line is a bullet point
              if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                return <p key={lineIdx} className="text-sm text-gray-600 ml-4">{line}</p>;
              }
              
              // Regular line
              return <p key={lineIdx} className="text-sm text-gray-600">{line}</p>;
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl">
            {reportType === 'summary' ? 'Performance Summary' : 
             reportType === 'comprehensive' ? 'Comprehensive Analysis' : 'Performance Report'}
          </CardTitle>
          <CardDescription>
            {period === 'daily' ? 'Today' : 
             period === 'weekly' ? 'This Week' : 
             period === 'monthly' ? 'This Month' : 
             period === 'quarterly' ? 'This Quarter' : 
             period === 'yearly' ? 'This Year' : period}
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            disabled={isLoading || !report}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="w-full h-[20px] rounded" />
            <Skeleton className="w-full h-[100px] rounded" />
            <Skeleton className="w-full h-[20px] rounded" />
            <Skeleton className="w-full h-[80px] rounded" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : report ? (
          typeof report === 'string' ? (
            renderSimpleReport(report)
          ) : (
            renderComprehensiveReport(report as ComprehensiveReport)
          )
        ) : (
          <p className="text-center text-gray-500">No report available</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AIGeneratedReport; 
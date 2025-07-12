'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, TrendingUp, TrendingDown, Activity, Calendar, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlatformStatus {
  platform: string;
  status: 'healthy' | 'attention' | 'critical';
  summary: string;
  keyMetrics: {
    spend: string;
    performance: string;
    trend: 'up' | 'down' | 'stable';
  };
}

interface ActionItem {
  platform: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
}

interface DailyReport {
  date: string;
  overallStatus: 'healthy' | 'attention' | 'critical';
  summary: string;
  platforms: PlatformStatus[];
  actionItems: ActionItem[];
  keyInsights: string[];
}

export default function DailyAIReportWidget() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDailyReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ai/daily-report');
      if (!response.ok) {
        throw new Error('Failed to fetch daily report');
      }
      
      const data = await response.json();
      setReport(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching daily report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyReport();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'attention': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Activity className="w-4 h-4 text-gray-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daily AI Report
          </CardTitle>
          <CardDescription>
            AI-powered overview of your marketing performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Daily AI Report
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-600 text-center mb-4">{error}</p>
          <Button onClick={fetchDailyReport} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Daily AI Report
            </CardTitle>
            <CardDescription>
              {report?.date} • AI-powered insights
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={getStatusColor(report?.overallStatus || 'healthy')}
            >
              {report?.overallStatus?.toUpperCase()}
            </Badge>
            <Button
              onClick={fetchDailyReport}
              variant="ghost"
              size="sm"
              className="p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Executive Summary */}
        <div>
          <h3 className="font-semibold mb-2">Executive Summary</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {report?.summary}
          </p>
        </div>

        <Separator />

        {/* Platform Status */}
        <div>
          <h3 className="font-semibold mb-3">Platform Status</h3>
          <div className="space-y-3">
            {report?.platforms?.map((platform, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{platform.platform}</span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getStatusColor(platform.status))}
                    >
                      {platform.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(platform.keyMetrics.trend)}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{platform.summary}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Spend: {platform.keyMetrics.spend}</span>
                  <span>Performance: {platform.keyMetrics.performance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Action Items */}
        <div>
          <h3 className="font-semibold mb-3">Action Items</h3>
          <div className="space-y-2">
            {report?.actionItems?.map((item, index) => (
              <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs mt-0.5", getPriorityColor(item.priority))}
                >
                  {item.priority.toUpperCase()}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.platform}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Key Insights */}
        <div>
          <h3 className="font-semibold mb-3">Key Insights</h3>
          <div className="space-y-2">
            {report?.keyInsights?.map((insight, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-xs text-gray-400 text-center pt-2 border-t">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
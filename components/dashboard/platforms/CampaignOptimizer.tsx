import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Target,
  DollarSign,
  ArrowRight,
  Users,
  Eye,
  ThumbsUp,
  MousePointer,
  Calendar,
  RotateCw,
  Settings,
  Zap,
  PlayCircle,
  PauseCircle,
  BarChart4,
  Filter,
  Loader2,
  MoveUp,
  Ban,
  Lightbulb,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useBrandContext } from "@/lib/context/BrandContext";

// Define types for campaign data
interface Creative {
  name: string;
  performance: string;
  ctr: number;
  convRate: number;
}

interface Insight {
  type: "warning" | "success" | "alert";
  title: string;
  description: string;
  impact: string;
  action: string;
}

interface QuickAction {
  icon: React.ReactNode;
  text: string;
  impact: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  spent: number;
  revenue: number;
  roas: number;
  ctr: number;
  cpm: number;
  cpc: number;
  issues: string[];
  recommendations: string[];
}

interface ChecklistItem {
  task: string;
  impact: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

export function CampaignOptimizer() {
  const { selectedBrandId } = useBrandContext();
  const [isLoading, setIsLoading] = useState(true);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("7D");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Add state for quick actions
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Simulated data - in a real app, this would come from your API calls
  const mockData = {
    overview: {
      performance: {
        spend: 1250.45,
        revenue: 4320.75,
        roas: 3.45,
        cac: 28.42,
        ctr: 2.1,
        conversionRate: 4.2,
      },
      insights: [
        {
          type: "warning" as const,
          title: "Audience Overlap Detected",
          description: "3 ad sets targeting similar audiences",
          impact: "Wasting $135/day in redundant targeting",
          action: "Merge Ad Sets",
        },
        {
          type: "success" as const,
          title: "Top Performer Identified",
          description: "Video ad \"Summer Collection 2023\" outperforms others by 37%",
          impact: "Potential 25% ROAS increase if scaled",
          action: "Increase Budget",
        },
        {
          type: "alert" as const,
          title: "Ad Fatigue Detected",
          description: "2 ad sets showing frequency > 5.0",
          impact: "CTR dropped 1.2% in last 48 hours",
          action: "Refresh Creatives",
        },
      ],
      quickActions: [
        {
          icon: <PauseCircle className="h-4 w-4 mr-2" />,
          text: "Pause Underperforming Ads (3)",
          impact: "Save $87.45/day",
        },
        {
          icon: <MoveUp className="h-4 w-4 mr-2" />,
          text: "Increase Budget on Top 2 Ad Sets",
          impact: "+$164.20 daily revenue (est.)",
        },
        {
          icon: <RefreshCw className="h-4 w-4 mr-2" />,
          text: "Update Ad Creative Rotation",
          impact: "Reduce audience fatigue by 31%",
        },
        {
          icon: <Ban className="h-4 w-4 mr-2" />,
          text: "Fix Audience Overlap Issues",
          impact: "Improve CPM by up to 18%",
        },
      ],
      topCreatives: [
        {
          name: "Summer Collection Video",
          performance: "32% above average",
          ctr: 3.8,
          convRate: 5.2,
        },
        {
          name: "Limited Time Offer Banner",
          performance: "27% above average",
          ctr: 3.4,
          convRate: 4.8,
        },
      ],
      underperformingCreatives: [
        {
          name: "Product Catalog Static",
          performance: "41% below average",
          ctr: 0.9,
          convRate: 1.4,
        },
      ],
    },
    campaigns: [
      {
        id: "camp_123",
        name: "Summer Collection 2023",
        status: "ACTIVE",
        spent: 763.42,
        revenue: 2891.35,
        roas: 3.79,
        ctr: 2.4,
        cpm: 12.35,
        cpc: 0.87,
        issues: [
          "Budget underutilized",
          "Strong performer could be scaled",
        ],
        recommendations: [
          "Increase daily budget by 30%",
          "Test lookalike audience based on purchasers",
        ],
      },
      {
        id: "camp_124",
        name: "Retargeting - Website Visitors",
        status: "ACTIVE",
        spent: 354.21,
        revenue: 1126.78,
        roas: 3.18,
        ctr: 1.8,
        cpm: 14.23,
        cpc: 0.92,
        issues: [
          "Ad frequency too high (6.2)",
          "Audience fatigue detected",
        ],
        recommendations: [
          "Add 2-3 new creative variations",
          "Broaden retargeting window (60 → 90 days)",
        ],
      },
      {
        id: "camp_125",
        name: "New Product Launch",
        status: "ACTIVE",
        spent: 132.82,
        revenue: 302.62,
        roas: 2.28,
        ctr: 1.2,
        cpm: 18.45,
        cpc: 1.24,
        issues: [
          "High CAC ($42.17)",
          "Low CTR relative to other campaigns",
        ],
        recommendations: [
          "Pause 2 worst-performing ads",
          "Test new hook in ad copy",
          "Narrow audience targeting",
        ],
      },
    ],
    checklist: [
      {
        task: "Pause 3 underperforming ad creatives",
        impact: "Save $87.45/day in ad spend",
        priority: "high" as const,
        completed: false,
      },
      {
        task: "Resolve audience overlap between Campaigns A and B",
        impact: "Improve campaign efficiency by 15-20%",
        priority: "high" as const,
        completed: false,
      },
      {
        task: "Increase budget for top-performing ad set by 20%",
        impact: "Capture additional $140-180 daily revenue",
        priority: "medium" as const,
        completed: false,
      },
      {
        task: "Test new hook variations in ad copy",
        impact: "Potential CTR improvement of 0.5-1.2%",
        priority: "medium" as const,
        completed: false,
      },
      {
        task: "Add exclusion for recent purchasers to all campaigns",
        impact: "Reduce wasted spend by 8-12%",
        priority: "low" as const,
        completed: true,
      },
    ],
  };

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      setIsLoading(true);
      // In a real implementation, fetch data from your API
      setTimeout(() => {
        setActiveCampaigns(mockData.campaigns);
        setIsLoading(false);
      }, 1500);
    };

    if (selectedBrandId) {
      loadData();
    }
  }, [selectedBrandId, selectedTimeframe]);

  // Handle campaign selection
  const handleCampaignSelect = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedTab("campaign-details");
  };

  // Add quick action handlers
  const handleQuickAction = async (actionText: string) => {
    setIsProcessingAction(true);
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Handle different quick actions
      switch (actionText) {
        case "Pause Underperforming Ads (3)":
          // Mock pausing ads
          console.log("Pausing 3 underperforming ads...");
          alert("Successfully paused 3 underperforming ads. Saving $87.45/day!");
          break;
        case "Increase Budget on Top 2 Ad Sets":
          // Mock budget increase
          console.log("Increasing budget on top ad sets...");
          alert("Increased budget on 2 top-performing ad sets. Expected +$164.20 daily revenue!");
          break;
        case "Update Ad Creative Rotation":
          // Mock creative rotation
          console.log("Updating ad creative rotation...");
          alert("Updated ad creative rotation. Audience fatigue reduced by 31%!");
          break;
        case "Fix Audience Overlap Issues":
          // Mock audience overlap fix
          console.log("Fixing audience overlap...");
          alert("Fixed audience overlap issues. CPM improved by up to 18%!");
          break;
        default:
          alert("Quick action executed successfully!");
      }
    } catch (error) {
      console.error("Error executing quick action:", error);
      alert("Error executing action. Please try again.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Add AI insight action handlers
  const handleInsightAction = async (actionText: string, insightTitle: string) => {
    setIsProcessingAction(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`Executing AI insight action: ${actionText} for ${insightTitle}`);
      alert(`Successfully executed: ${actionText}`);
    } catch (error) {
      console.error("Error executing insight action:", error);
      alert("Error executing insight action. Please try again.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Add creative action handlers
  const handleCreativeAction = async (action: string, creativeName: string) => {
    setIsProcessingAction(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      switch (action) {
        case "pause":
          console.log(`Pausing creative: ${creativeName}`);
          alert(`Successfully paused "${creativeName}"`);
          break;
        case "replace":
          console.log(`Replacing creative: ${creativeName}`);
          alert(`Initiated replacement process for "${creativeName}"`);
          break;
        default:
          alert("Creative action executed successfully!");
      }
    } catch (error) {
      console.error("Error executing creative action:", error);
      alert("Error executing creative action. Please try again.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Insight type to icon and color mapping
  const insightTypeMap = {
    warning: {
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
    },
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
    },
    alert: {
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
  };

  // Priority to color mapping
  const priorityColorMap: Record<ChecklistItem["priority"], string> = {
    high: "text-red-500",
    medium: "text-yellow-500",
    low: "text-green-500",
  };

  // Render the overview tab
  const renderOverview = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Performance Overview */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Performance Overview
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge
                variant={selectedTimeframe === "Today" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTimeframe("Today")}
              >
                Today
              </Badge>
              <Badge
                variant={selectedTimeframe === "7D" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTimeframe("7D")}
              >
                7D
              </Badge>
              <Badge
                variant={selectedTimeframe === "30D" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedTimeframe("30D")}
              >
                30D
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Spend
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  ${mockData.overview.performance.spend.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Revenue
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  ${mockData.overview.performance.revenue.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> ROAS
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  {mockData.overview.performance.roas.toFixed(2)}x
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <Users className="h-3.5 w-3.5 mr-1" /> CAC
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  ${mockData.overview.performance.cac.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <MousePointer className="h-3.5 w-3.5 mr-1" /> CTR
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  {mockData.overview.performance.ctr.toFixed(1)}%
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <Target className="h-3.5 w-3.5 mr-1" /> Conv. Rate
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  {mockData.overview.performance.conversionRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" /> Top Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.campaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="bg-[#242424] p-3 rounded-md cursor-pointer hover:bg-[#2A2A2A] transition-colors"
                  onClick={() => handleCampaignSelect(campaign)}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-white font-medium">{campaign.name}</div>
                    <Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <div className="text-xs">
                      <span className="text-gray-400">ROAS: </span>
                      <span className={campaign.roas >= 3 ? "text-green-500" : campaign.roas >= 2 ? "text-yellow-500" : "text-red-500"}>
                        {campaign.roas && typeof campaign.roas === 'number' ? campaign.roas.toFixed(2) : '0.00'}x
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-400">Spent: </span>
                                              <span className="text-white">${campaign.spent && typeof campaign.spent === 'number' ? campaign.spent.toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-gray-400">CTR: </span>
                                              <span className="text-white">{campaign.ctr && typeof campaign.ctr === 'number' ? campaign.ctr.toFixed(1) : '0.0'}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Optimization Checklist */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Daily Optimization Checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.checklist.map((item, index) => (
                <div key={index} className="flex items-start gap-3 bg-[#242424] p-3 rounded-md">
                  <div className="mt-0.5">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      className="rounded-sm"
                      readOnly
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">{item.task}</div>
                    <div className="text-gray-400 text-xs mt-1">Impact: {item.impact}</div>
                    <div className="text-xs mt-1">
                      Priority: <span className={priorityColorMap[item.priority]}>{item.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockData.overview.quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.text)}
                  disabled={isProcessingAction}
                  className="w-full bg-[#242424] p-3 rounded-md hover:bg-[#2A2A2A] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {isProcessingAction ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        action.icon
                      )}
                      <span className="text-white font-medium">{action.text}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="text-xs text-green-500 mt-1">{action.impact}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="md:col-span-2 bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.overview.insights.map((insight, index) => {
                const { icon, bgColor, borderColor } = insightTypeMap[insight.type];
                return (
                  <div 
                    key={index} 
                    className={`p-4 rounded-md border ${borderColor} ${bgColor}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{icon}</div>
                      <div>
                        <div className="text-white font-medium">{insight.title}</div>
                        <div className="text-gray-300 mt-1">{insight.description}</div>
                        <div className="text-sm mt-2">
                          <span className="text-gray-400">Impact: </span>
                          <span className="text-white">{insight.impact}</span>
                        </div>
                        <Button size="sm" className="mt-3" onClick={() => handleInsightAction(insight.action, insight.title)}>
                          {insight.action} <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Creative Performance */}
        <Card className="md:col-span-2 bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5" /> Creative Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-green-500" /> Top Performing Creatives
                </h4>
                <div className="space-y-3">
                  {mockData.overview.topCreatives.map((creative, index) => (
                    <div key={index} className="bg-[#242424] p-3 rounded-md">
                      <div className="flex justify-between">
                        <div className="text-white font-medium">{creative.name}</div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                          {creative.performance}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <div>CTR: <span className="text-white">{creative.ctr}%</span></div>
                        <div>Conv. Rate: <span className="text-white">{creative.convRate}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <TrendingDown className="h-4 w-4 mr-2 text-red-500" /> Underperforming Creatives
                </h4>
                <div className="space-y-3">
                  {mockData.overview.underperformingCreatives.map((creative, index) => (
                    <div key={index} className="bg-[#242424] p-3 rounded-md">
                      <div className="flex justify-between">
                        <div className="text-white font-medium">{creative.name}</div>
                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                          {creative.performance}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <div>CTR: <span className="text-white">{creative.ctr}%</span></div>
                        <div>Conv. Rate: <span className="text-white">{creative.convRate}%</span></div>
                      </div>
                      <div className="mt-3 flex space-x-2">
                        <Button size="sm" variant="destructive" onClick={() => handleCreativeAction("pause", creative.name)}>
                          <PauseCircle className="h-3 w-3 mr-1" /> Pause
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleCreativeAction("replace", creative.name)}>
                          <RefreshCw className="h-3 w-3 mr-1" /> Replace
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render the campaign details tab
  const renderCampaignDetails = () => {
    if (!selectedCampaign) return null;

    return (
      <div className="space-y-4">
        {/* Campaign Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{selectedCampaign.name}</h2>
            <div className="flex items-center mt-1">
              <Badge
                variant={selectedCampaign.status === "ACTIVE" ? "default" : "secondary"}
                className="mr-2"
              >
                {selectedCampaign.status}
              </Badge>
              <span className="text-gray-400 text-sm">ID: {selectedCampaign.id}</span>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedTab("overview")}
            className="bg-[#242424] border-[#333]"
          >
            Back to Overview
          </Button>
        </div>

        {/* Campaign Performance */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Spend
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  ${selectedCampaign.spent.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Revenue
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  ${selectedCampaign.revenue.toFixed(2)}
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> ROAS
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  {selectedCampaign.roas.toFixed(2)}x
                </div>
              </div>
              <div className="bg-[#242424] p-3 rounded-md">
                <div className="text-gray-400 text-sm flex items-center">
                  <MousePointer className="h-3.5 w-3.5 mr-1" /> CTR
                </div>
                <div className="text-white text-lg font-medium mt-1">
                  {selectedCampaign.ctr.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Issues & Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> Campaign Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedCampaign.issues.map((issue, index) => (
                  <div key={index} className="bg-[#242424] p-3 rounded-md border-l-4 border-red-500">
                    <div className="text-white">{issue}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="h-5 w-5" /> AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedCampaign.recommendations.map((recommendation, index) => (
                  <div key={index} className="bg-[#242424] p-3 rounded-md border-l-4 border-blue-500">
                    <div className="text-white">{recommendation}</div>
                    <Button size="sm" className="mt-2">
                      Apply Recommendation
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forecast & Impact Modeling */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart4 className="h-5 w-5" /> Forecasting & Impact Modeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-[#242424] p-4 rounded-md">
              <h3 className="text-white font-medium mb-3">If you increase budget by 20%:</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Estimated Daily Spend</span>
                    <span className="text-white">${(selectedCampaign.spent * 1.2).toFixed(2)}</span>
                  </div>
                  <Progress value={80} className="h-2 bg-[#333]" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Projected Daily Revenue</span>
                    <span className="text-white">${(selectedCampaign.revenue * 1.18).toFixed(2)}</span>
                  </div>
                  <Progress value={78} className="h-2 bg-[#333]" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Projected ROAS</span>
                    <span className="text-white">{(selectedCampaign.roas * 0.98).toFixed(2)}x</span>
                  </div>
                  <Progress value={70} className="h-2 bg-[#333]" />
                </div>
              </div>
              <div className="mt-4">
                <Button size="sm">Apply Budget Change</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333] text-white w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Campaign Optimizer
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-400 mb-4" />
              <p className="text-gray-400">Loading campaign data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No brand selected state
  if (!selectedBrandId) {
    return (
      <Card className="bg-[#1A1A1A] border-[#333] text-white w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Campaign Optimizer
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Settings className="h-10 w-10 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Brand Selected</h3>
              <p className="text-gray-400">
                Please select a brand from the sidebar to view campaign optimization insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs 
      value={selectedTab} 
      onValueChange={setSelectedTab} 
      className="w-full"
    >
      <div className="flex justify-between items-center mb-4">
        <TabsList className="bg-[#1A1A1A]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#2A2A2A]">
            <Sparkles className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="campaign-details" className="data-[state=active]:bg-[#2A2A2A]">
            <Target className="h-4 w-4 mr-2" />
            Campaign Deep Dive
          </TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="bg-[#242424] border-[#333]"
            onClick={() => setIsLoading(true)}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <TabsContent value="overview" className="m-0">
        {renderOverview()}
      </TabsContent>

      <TabsContent value="campaign-details" className="m-0">
        {renderCampaignDetails()}
      </TabsContent>
    </Tabs>
  );
} 
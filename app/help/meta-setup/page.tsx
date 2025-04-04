"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertBox } from "@/components/ui/alert-box"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import Link from "next/link"

export default function MetaSetupHelp() {
  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Meta Account Setup & Troubleshooting</h1>

      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Setting Up Your Meta Ad Account</h2>
        <p className="mb-4">
          To properly display Meta advertising data in your dashboard, you need an active Meta Business Manager 
          account with at least one ad campaign that has run. Here's how to set everything up:
        </p>

        <Tabs defaultValue="setup">
          <TabsList className="mb-4">
            <TabsTrigger value="setup">Initial Setup</TabsTrigger>
            <TabsTrigger value="test">Creating Test Data</TabsTrigger>
            <TabsTrigger value="troubleshoot">Troubleshooting</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">1. Create a Meta Business Manager Account</h3>
              <p>If you don't already have one, create a Meta Business Manager account at <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">business.facebook.com</a>.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">2. Create an Ad Account</h3>
              <p>In Business Manager, go to Business Settings → Accounts → Ad Accounts → Add → Create a New Ad Account.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">3. Connect Your Meta Account to Our Dashboard</h3>
              <p>Go to Settings in our dashboard and click "Connect Meta Account". Follow the prompts to authenticate and authorize access.</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">4. Create and Run at Least One Campaign</h3>
              <p>Meta only provides data for campaigns that have run (even briefly). Create a small test campaign with a minimal budget to generate data.</p>
            </div>
            
            <AlertBox
              type="info"
              title="Important Note"
              className="mt-4"
            >
              Meta only reports data for campaigns that have been active. Draft campaigns or campaigns that have never run will not show in the dashboard.
            </AlertBox>
          </TabsContent>
          
          <TabsContent value="test" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Creating a Test Campaign</h3>
              <p>To generate data for your dashboard without spending much money:</p>
              
              <ol className="list-decimal pl-6 space-y-2 mt-2">
                <li>Go to <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Meta Ads Manager</a></li>
                <li>Click "Create" to start a new campaign</li>
                <li>Select an objective like "Traffic" or "Engagement"</li>
                <li>Set up your campaign with these minimums:
                  <ul className="list-disc pl-6 mt-1">
                    <li>Daily budget: $1.00 USD (minimum)</li>
                    <li>Duration: 1 day</li>
                    <li>Target audience: Very specific to minimize actual reach</li>
                    <li>Create a simple ad with minimal effort</li>
                  </ul>
                </li>
                <li>Launch the campaign and let it run for at least a few hours</li>
                <li>You can pause the campaign after it has started running</li>
                <li>Use the "Refresh Meta Data" button in the dashboard to sync the data</li>
              </ol>
            </div>
            
            <AlertBox
              type="warning"
              title="Test Account Alternative"
              className="mt-4"
            >
              <p>Meta also offers a "Test Account" feature for developers that allows creating test campaigns without spending real money. To create a test account:</p>
              <ol className="list-decimal pl-6 space-y-1 mt-2">
                <li>Go to Business Settings → Accounts → Ad Accounts</li>
                <li>Click Add → Request Access to an Ad Account</li>
                <li>Select "Create a test account"</li>
                <li>Use this test account to create campaigns for testing</li>
              </ol>
            </AlertBox>
          </TabsContent>
          
          <TabsContent value="troubleshoot" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Common Issues</h3>
              
              <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium">No Data Showing in Dashboard</h4>
                  <ul className="list-disc pl-6 mt-2">
                    <li>Ensure you have at least one campaign that has run (not in draft status)</li>
                    <li>Use the "Run Diagnostics" button to check your connection and campaign status</li>
                    <li>Try using the "Refresh Meta Data" button to force a new sync</li>
                    <li>Verify your Meta account permissions are set correctly and haven't expired</li>
                  </ul>
                </div>
                
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium">Connection Issues</h4>
                  <ul className="list-disc pl-6 mt-2">
                    <li>Reconnect your Meta account in Settings</li>
                    <li>Ensure you've granted all required permissions during the connection process</li>
                    <li>Check that your Meta Business Manager account is in good standing</li>
                  </ul>
                </div>
                
                <div className="p-4">
                  <h4 className="font-medium">Data Discrepancies</h4>
                  <ul className="list-disc pl-6 mt-2">
                    <li>Meta data typically updates once per day</li>
                    <li>Recent campaign changes may take 24-48 hours to appear in our dashboard</li>
                    <li>Use the Refresh button to ensure you have the latest data</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Understanding Meta Data Requirements</h3>
              <p className="mb-2">Meta only provides analytics data for campaigns that have been active and received impressions/clicks. Here's what you need to know:</p>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
                <h4 className="font-medium text-amber-600 dark:text-amber-400">Draft Campaigns Don't Generate Data</h4>
                <p className="mt-1 text-sm">Campaigns that are in draft status or have never been activated will not appear in your dashboard, even though they exist in your Meta account.</p>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mt-3">
                <h4 className="font-medium text-green-600 dark:text-green-400">Minimum Requirements for Data</h4>
                <p className="mt-1 text-sm">To see data in your dashboard, make sure you have:</p>
                <ul className="list-disc pl-6 text-sm mt-2">
                  <li>At least one campaign that has been active (even if currently paused)</li>
                  <li>The campaign has received at least some impressions</li>
                  <li>You've spent at least some budget ($1 is enough)</li>
                </ul>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mt-3">
                <h4 className="font-medium text-blue-600 dark:text-blue-400">Using Test Accounts</h4>
                <p className="mt-1 text-sm">Meta offers test accounts that can generate data without spending real money:</p>
                <ol className="list-decimal pl-6 text-sm mt-2">
                  <li>In Business Manager, go to Business Settings → Accounts → Ad Accounts</li>
                  <li>Click Add → Request Access to an Ad Account</li>
                  <li>Select "Create a test account"</li>
                  <li>Create campaigns in this test account - they'll generate data without real spending</li>
                  <li>Connect this test account to our platform</li>
                </ol>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Diagnostic Tools</h3>
              <p>On the Meta tab of your dashboard, you can use these tools when troubleshooting:</p>
              <ul className="list-disc pl-6 mt-2">
                <li><strong>Run Diagnostics</strong> - Checks your Meta connection, ad accounts, and campaigns</li>
                <li><strong>Test Fetch Data</strong> - Checks if Meta is returning actual data for your account without storing it</li>
                <li><strong>Refresh Meta Data</strong> - Clears cached data and pulls fresh data from Meta</li>
              </ul>
              
              <AlertBox
                type="info"
                title="Advanced Troubleshooting"
                className="mt-4"
              >
                <p className="text-sm">If you're still having issues after trying the steps above, check these advanced troubleshooting options:</p>
                <ol className="list-decimal pl-6 text-sm mt-2">
                  <li>Verify that your Meta account has the necessary permissions granted (ads_read, read_insights)</li>
                  <li>Check if your Meta account is in good standing with no restrictions</li>
                  <li>Ensure your ad account isn't disabled or restricted</li>
                  <li>Try reconnecting your Meta account from Settings → Connections</li>
                </ol>
              </AlertBox>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      
      <div className="flex justify-between items-center mt-8">
        <Link href="/dashboard">
          <Button variant="outline">Return to Dashboard</Button>
        </Link>
        
        <Link href="/settings">
          <Button>Go to Settings</Button>
        </Link>
      </div>
    </div>
  )
} 
import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Use dynamic import to prevent auth context issues during static generation
const AIGeneratedReportWithAuth = dynamic(
  () => import('@/components/reports/AIGeneratedReportWithAuth'),
  { 
    loading: () => (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    ),
    ssr: false
  }
);

// Prevent static generation for this page
export const getStaticProps = () => {
  return {
    notFound: true // This will make Next.js skip static generation
  };
};

const ReportsPage: NextPage = () => {
  const [reportType, setReportType] = useState<'summary' | 'comprehensive' | 'basic'>('summary');
  const [period, setPeriod] = useState<string>('weekly');

  return (
    <>
      <Head>
        <title>AI Reports | Brez Marketing</title>
        <meta name="description" content="AI-Generated marketing and sales reports" />
      </Head>
      
      <div className="p-8">
        <div className="container mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">AI Reports</h1>
              <p className="text-muted-foreground">
                AI-generated analysis and recommendations based on your data
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select
                value={reportType}
                onValueChange={(value) => setReportType(value as any)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={period}
                onValueChange={setPeriod}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Today</SelectItem>
                  <SelectItem value="weekly">This Week</SelectItem>
                  <SelectItem value="monthly">This Month</SelectItem>
                  <SelectItem value="quarterly">This Quarter</SelectItem>
                  <SelectItem value="yearly">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="reports" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="reports" className="mt-6">
              <AIGeneratedReportWithAuth 
                reportType={reportType} 
                period={period} 
              />
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-12">
                    Your report history will appear here.
                    <br />
                    Generated reports are saved automatically for future reference.
                  </p>
                  <div className="flex justify-center">
                    <Button variant="outline" disabled>View Saved Reports</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default ReportsPage; 
"use client"

import { useState, useEffect } from 'react'
import { MetricCard } from './MetricCard'
import { cn } from "@/lib/utils"
import { DollarSign, ShoppingCart, CreditCard, Percent, RefreshCcw } from "lucide-react"

interface CountCardProps {
  title: string
  id: number  // ID used to determine which metric to fetch
  brandId: string
  period: 'daily' | 'monthly'
  className?: string
}

export function CountCard({ title, id, brandId, period, className }: CountCardProps) {
  const [value, setValue] = useState<number>(0)
  const [previousValue, setPreviousValue] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    const fetchMetric = async () => {
      setLoading(true)
      try {
        // Determine which endpoint to use based on the ID
        let endpoint = '';
        let valueFormat: 'number' | 'currency' | 'percentage' = 'number';
        let prefix = '';
        let suffix = '';
        let decimals = 0;
        
        switch (id) {
          case 1: // Revenue
            endpoint = `/api/metrics/shopify/revenue?brandId=${brandId}&period=${period}`;
            valueFormat = 'currency';
            prefix = '$';
            break;
          case 2: // Orders
            endpoint = `/api/metrics/shopify/orders?brandId=${brandId}&period=${period}`;
            break;
          case 3: // Ad Spend
            endpoint = `/api/metrics/meta/single?metric=spend&brandId=${brandId}&period=${period}`;
            valueFormat = 'currency';
            prefix = '$';
            break;
          case 4: // ROAS (Return on Ad Spend)
            endpoint = `/api/metrics/combined/roas?brandId=${brandId}&period=${period}`;
            valueFormat = 'number';
            decimals = 2;
            prefix = '';
            suffix = 'x';
            break;
          case 5: // AOV (Average Order Value)
            endpoint = `/api/metrics/shopify/aov?brandId=${brandId}&period=${period}`;
            valueFormat = 'currency';
            prefix = '$';
            break;
          case 7: // ACOS (Advertising Cost of Sales)
            endpoint = `/api/metrics/combined/acos?brandId=${brandId}&period=${period}`;
            valueFormat = 'percentage';
            decimals = 1;
            break;
          default:
            throw new Error(`Unknown metric ID: ${id}`);
        }

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch metric');
        
        const result = await response.json();
        setValue(result.value || 0);
        setPreviousValue(result.previousValue || 0);
        
        // If there's time series data available
        if (result.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error(`Error fetching metric (ID: ${id}):`, error);
        setValue(0);
        setPreviousValue(0);
      } finally {
        setLoading(false);
      }
    };

    fetchMetric();
  }, [id, brandId, period]);

  // Determine icon based on metric type
  const getIcon = () => {
    switch (id) {
      case 1: // Revenue
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 2: // Orders
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case 3: // Ad Spend
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      case 4: // ROAS
        return <RefreshCcw className="h-4 w-4 text-teal-500" />;
      case 5: // AOV
        return <DollarSign className="h-4 w-4 text-amber-500" />;
      case 7: // ACOS
        return <Percent className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // Determine formatting based on the metric type
  const getFormatting = () => {
    switch (id) {
      case 1: // Revenue
      case 3: // Ad Spend
      case 5: // AOV
        return { 
          valueFormat: 'currency' as const, 
          prefix: '$', 
          suffix: '' 
        };
      case 2: // Orders
        return { 
          valueFormat: 'number' as const, 
          prefix: '', 
          suffix: '' 
        };
      case 4: // ROAS
        return { 
          valueFormat: 'number' as const, 
          prefix: '', 
          suffix: 'x',
          decimals: 2
        };
      case 7: // ACOS
        return { 
          valueFormat: 'percentage' as const, 
          prefix: '', 
          suffix: '%',
          decimals: 1
        };
      default:
        return { 
          valueFormat: 'number' as const, 
          prefix: '', 
          suffix: '' 
        };
    }
  };

  const format = getFormatting();
  const icon = getIcon();

  // Calculate percent change
  const percentChange = previousValue 
    ? ((value - previousValue) / previousValue) * 100 
    : 0;

  return (
    <MetricCard
      title={title}
      value={value}
      change={percentChange}
      data={data}
      loading={loading}
      icon={icon}
      className={cn("min-h-[120px]", className)}
      valueFormat={format.valueFormat}
      prefix={format.prefix}
      suffix={format.suffix}
      decimals={format.decimals || 0}
      showPreviousPeriod={true}
      previousValue={previousValue}
      previousValueFormat={format.valueFormat}
      previousValuePrefix={format.prefix}
      previousValueSuffix={format.suffix}
      previousValueDecimals={format.decimals || 0}
      brandId={brandId}
    />
  );
} 
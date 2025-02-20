"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/utils/supabase"
import { useUser } from "@clerk/nextjs"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.brezmarketingdashboard.com';

interface Order {
  total_price?: string | number;
  [key: string]: any;
}

export function StoreSelector({ onStoreSelect }: { onStoreSelect: (store: string) => void }) {
  const [stores, setStores] = useState<string[]>([])
  const { user } = useUser()

  useEffect(() => {
    if (user) {
      loadUserStores()
    }
  }, [user])

  const loadUserStores = async () => {
    console.log('Loading stores for user:', user?.id)
    
    const { data, error } = await supabase
      .from('brands')
      .select(`
        id,
        platform_connections (
          store_url
        )
      `)
      .eq('user_id', user?.id)

    console.log('User brands:', data)

    if (!error && data) {
      const storeUrls = data
        .flatMap(brand => brand.platform_connections || [])
        .filter(conn => conn?.store_url)
        .map(conn => conn.store_url)
      
      console.log('Processed store URLs:', storeUrls)
      setStores(storeUrls)
    }
  }

  const createTestConnection = async () => {
    const brandId = '299e66f2-7b67-4f71-b45f-a2c299843330'
    
    // This should be your actual Shopify access token from the app installation
    const shopifyAccessToken = 'shpat_xxxxx' // Replace with your actual access token
    
    const { data, error } = await supabase
      .from('platform_connections')
      .insert([
        {
          brand_id: brandId,
          platform_type: 'shopify',
          store_url: '4xaq8j-5m.myshopify.com',
          access_token: shopifyAccessToken,
          connected_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Error creating connection:', error)
    } else {
      console.log('Created connection:', data)
      loadUserStores()
    }
  }

  const processApiResponse = (data: any) => {
    console.log('Raw API Response:', data);
    
    const orders = data?.orders?.map((order: Order) => {
      console.log('Processing order:', order);
      console.log('Order total_price:', order.total_price);
      
      return {
        ...order,
        total: Number(order.total_price || 0).toFixed(2),
      };
    }) || [];

    const result = {
      orders,
      products: data?.products || [],
      refunds: data?.refunds || [],
      customerSegments: data?.customerSegments || {},
      totalSales: Number(data?.totalSales || 0).toFixed(2)
    };

    console.log('Processed result:', result);
    return result;
  };

  const fetchStoreData = async (storeUrl: string) => {
    try {
      console.log('Fetching data for store:', storeUrl);
      const response = await fetch(`${API_URL}/api/shopify/sales?shop=${storeUrl}`);
      console.log('Response status:', response.status);
      const data = await response.json();
      return processApiResponse(data);
    } catch (error) {
      console.error('Error fetching store data:', error);
      return {
        orders: [],
        products: [],
        refunds: [],
        customerSegments: {},
        totalSales: "0.00"
      };
    }
  };

  return (
    <div>
      <Select onValueChange={onStoreSelect}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a store" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store} value={store}>
              {store}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button 
        onClick={createTestConnection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add Test Connection
      </button>
    </div>
  )
}


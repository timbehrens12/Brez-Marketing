export interface ShopifyInventoryItem {
  id: string;
  brand_id: string;
  connection_id: string;
  product_id: string;
  variant_id: string;
  inventory_item_id: string;
  sku: string;
  product_title: string;
  variant_title: string | null;
  inventory_quantity: number;
  last_updated: string;
}

export interface InventorySummary {
  totalProducts: number;
  totalInventory: number;
  lowStockItems: number;
  outOfStockItems: number;
  averageInventoryLevel: number;
} 
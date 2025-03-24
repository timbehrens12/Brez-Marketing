export interface LineItem {
  id: number
  title: string
  quantity: number
  price: string
  variant_id: number
  product_id: number // Add this line
  name: string // Add this line
}

export interface Order {
  id: number
  name: string
  created_at: string
  total_price: string
  subtotal_price: string
  total_discounts?: string
  currency: string
  line_items: LineItem[]
  fulfillment_status: string | null
  customer?: Customer
  shipping_lines?: Array<{
    price: string
  }>
  tax_lines?: Array<{
    price: string
  }>
  order_id?: number // For refund orders
}

export interface Customer {
  id: number
  email: string
  first_name: string
  last_name: string
}


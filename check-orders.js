// Script to check actual Shopify orders in database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
  console.log('🔍 CHECKING SHOPIFY ORDERS IN DATABASE');
  console.log('=====================================');

  // Get recent orders
  const { data: orders, error } = await supabase
    .from('shopify_orders')
    .select('order_number, total_price, created_at, brand_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  console.log(`Found ${orders?.length || 0} recent orders:`);
  orders?.forEach((order, i) => {
    const date = new Date(order.created_at);
    console.log(`${i + 1}. Order #${order.order_number}: $${order.total_price}`);
    console.log(`   Brand ID: ${order.brand_id}`);
    console.log(`   Created: ${order.created_at}`);
    console.log(`   UTC: ${date.toISOString()}`);
    console.log(`   Local: ${date.toString()}`);
    console.log('   ---');
  });

  // Check today's orders specifically
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  console.log('\n📅 Today\'s orders query:');
  console.log(`Looking for orders between:`);
  console.log(`Start: ${startOfDay.toISOString()}`);
  console.log(`End: ${endOfDay.toISOString()}`);

  const { data: todayOrders, error: todayError } = await supabase
    .from('shopify_orders')
    .select('order_number, total_price, created_at, brand_id')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: false });

  if (todayError) {
    console.error('Error fetching today orders:', todayError);
    return;
  }

  console.log(`\n📊 Today's orders: ${todayOrders?.length || 0}`);
  const total = todayOrders?.reduce((sum, order) => sum + parseFloat(order.total_price), 0) || 0;
  console.log(`💰 Today's total: $${total.toFixed(2)}`);

  todayOrders?.forEach((order, i) => {
    const date = new Date(order.created_at);
    console.log(`${i + 1}. Order #${order.order_number}: $${order.total_price} at ${order.created_at}`);
  });
}

checkOrders().catch(console.error);

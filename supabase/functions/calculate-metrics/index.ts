import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { startDate, endDate } = await req.json();

    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    console.log(`Calculating metrics from ${start.toISOString()} to ${end.toISOString()}`);

    // Get all transactions in range
    const { data: transactions, error: txError } = await supabase
      .from('normalized_transactions')
      .select(`
        *,
        normalized_transaction_items (*)
      `)
      .gte('transaction_date', start.toISOString())
      .lte('transaction_date', end.toISOString())
      .eq('status', 'completed');

    if (txError) throw txError;

    // Get expenses in range
    const { data: expenses, error: expError } = await supabase
      .from('normalized_expenses')
      .select('*')
      .gte('expense_date', start.toISOString().split('T')[0])
      .lte('expense_date', end.toISOString().split('T')[0]);

    if (expError) throw expError;

    // Group transactions by date
    const dailyMetrics = new Map<string, {
      revenue: number;
      orders: number;
      items: number;
      customers: Set<string>;
      newCustomers: Set<string>;
      products: Map<string, { quantity: number; revenue: number; name: string }>;
      expenses: number;
      expenseBreakdown: Map<string, number>;
    }>();

    // Get existing customer IDs (those who ordered before start date)
    const { data: existingCustomers } = await supabase
      .from('normalized_transactions')
      .select('customer_id')
      .lt('transaction_date', start.toISOString())
      .eq('status', 'completed');

    const existingCustomerIds = new Set(existingCustomers?.map(c => c.customer_id).filter(Boolean) || []);

    // Process transactions
    for (const tx of transactions || []) {
      const dateKey = new Date(tx.transaction_date).toISOString().split('T')[0];
      
      if (!dailyMetrics.has(dateKey)) {
        dailyMetrics.set(dateKey, {
          revenue: 0,
          orders: 0,
          items: 0,
          customers: new Set(),
          newCustomers: new Set(),
          products: new Map(),
          expenses: 0,
          expenseBreakdown: new Map(),
        });
      }

      const day = dailyMetrics.get(dateKey)!;
      day.revenue += parseFloat(tx.total || '0');
      day.orders++;
      
      if (tx.customer_id) {
        day.customers.add(tx.customer_id);
        if (!existingCustomerIds.has(tx.customer_id)) {
          day.newCustomers.add(tx.customer_id);
          existingCustomerIds.add(tx.customer_id); // Mark as existing for subsequent days
        }
      }

      // Process items
      for (const item of tx.normalized_transaction_items || []) {
        day.items += item.quantity;
        
        const productKey = item.product_name;
        const existing = day.products.get(productKey) || { quantity: 0, revenue: 0, name: productKey };
        existing.quantity += item.quantity;
        existing.revenue += parseFloat(item.total_price || '0');
        day.products.set(productKey, existing);
      }
    }

    // Process expenses
    for (const exp of expenses || []) {
      const dateKey = exp.expense_date;
      
      if (!dailyMetrics.has(dateKey)) {
        dailyMetrics.set(dateKey, {
          revenue: 0,
          orders: 0,
          items: 0,
          customers: new Set(),
          newCustomers: new Set(),
          products: new Map(),
          expenses: 0,
          expenseBreakdown: new Map(),
        });
      }

      const day = dailyMetrics.get(dateKey)!;
      day.expenses += parseFloat(exp.amount || '0');
      
      const category = exp.category || 'other';
      day.expenseBreakdown.set(
        category,
        (day.expenseBreakdown.get(category) || 0) + parseFloat(exp.amount || '0')
      );
    }

    // Calculate previous period for comparison
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
    const { data: previousTransactions } = await supabase
      .from('normalized_transactions')
      .select('total')
      .gte('transaction_date', previousStart.toISOString())
      .lt('transaction_date', start.toISOString())
      .eq('status', 'completed');

    const previousRevenue = previousTransactions?.reduce((sum, tx) => sum + parseFloat(tx.total || '0'), 0) || 0;
    const previousOrders = previousTransactions?.length || 0;

    // Upsert daily metrics
    const metricsToUpsert = [];
    
    for (const [dateKey, day] of dailyMetrics) {
      const topProducts = Array.from(day.products.entries())
        .map(([productName, data]) => ({ name: productName, quantity: data.quantity, revenue: data.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const currentRevenue = day.revenue;
      const currentOrders = day.orders;
      
      // Calculate change percentages
      const revenueChange = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue / dailyMetrics.size) / (previousRevenue / dailyMetrics.size)) * 100 
        : 0;
      const ordersChange = previousOrders > 0 
        ? ((currentOrders - previousOrders / dailyMetrics.size) / (previousOrders / dailyMetrics.size)) * 100 
        : 0;

      metricsToUpsert.push({
        metric_date: dateKey,
        total_revenue: day.revenue,
        gross_profit: day.revenue - day.expenses, // Simplified
        net_revenue: day.revenue - day.expenses,
        total_orders: day.orders,
        average_order_value: day.orders > 0 ? day.revenue / day.orders : 0,
        new_customers: day.newCustomers.size,
        returning_customers: day.customers.size - day.newCustomers.size,
        total_customers: day.customers.size,
        items_sold: day.items,
        top_products: topProducts,
        revenue_change_percent: Math.round(revenueChange * 100) / 100,
        orders_change_percent: Math.round(ordersChange * 100) / 100,
        total_expenses: day.expenses,
        expense_breakdown: Object.fromEntries(day.expenseBreakdown),
        updated_at: new Date().toISOString(),
      });
    }

    // Upsert all metrics
    if (metricsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('metrics_daily')
        .upsert(metricsToUpsert, {
          onConflict: 'metric_date',
          ignoreDuplicates: false,
        });

      if (upsertError) throw upsertError;
    }

    // Calculate summary
    const totalRevenue = Array.from(dailyMetrics.values()).reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = Array.from(dailyMetrics.values()).reduce((sum, d) => sum + d.orders, 0);
    const totalExpenses = Array.from(dailyMetrics.values()).reduce((sum, d) => sum + d.expenses, 0);
    const allCustomers = new Set<string>();
    const allNewCustomers = new Set<string>();
    
    for (const day of dailyMetrics.values()) {
      day.customers.forEach(c => allCustomers.add(c));
      day.newCustomers.forEach(c => allNewCustomers.add(c));
    }

    const summary = {
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        days: dailyMetrics.size,
      },
      revenue: {
        total: totalRevenue,
        average: dailyMetrics.size > 0 ? totalRevenue / dailyMetrics.size : 0,
        changePercent: previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0,
      },
      orders: {
        total: totalOrders,
        average: dailyMetrics.size > 0 ? totalOrders / dailyMetrics.size : 0,
        averageValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      customers: {
        total: allCustomers.size,
        new: allNewCustomers.size,
        returning: allCustomers.size - allNewCustomers.size,
        returningPercent: allCustomers.size > 0 ? ((allCustomers.size - allNewCustomers.size) / allCustomers.size) * 100 : 0,
      },
      expenses: {
        total: totalExpenses,
        average: dailyMetrics.size > 0 ? totalExpenses / dailyMetrics.size : 0,
      },
      profit: {
        gross: totalRevenue - totalExpenses,
        margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      },
    };

    console.log('Metrics calculation complete:', summary);

    return new Response(JSON.stringify({
      message: 'Metrics calculated successfully',
      daysProcessed: metricsToUpsert.length,
      summary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Metrics calculation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

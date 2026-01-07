import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  data: any[];
  dataType: 'orders' | 'products' | 'customers' | 'expenses';
  sourceType: 'csv' | 'manual' | 'woocommerce' | 'shopify';
  sourceName?: string;
  mapping?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!userRole) {
      throw new Error('Admin access required');
    }

    const { data, dataType, sourceType, sourceName, mapping }: ImportRequest = await req.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data provided');
    }

    console.log(`Importing ${data.length} ${dataType} records from ${sourceType}`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Store raw import
        const { data: rawImport, error: rawError } = await supabase
          .from('raw_imports')
          .insert({
            source_type: sourceType,
            source_name: sourceName || `Import ${new Date().toISOString()}`,
            data_type: dataType,
            raw_data: row,
            row_index: i,
            status: 'processing',
            created_by: user.id,
          })
          .select()
          .single();

        if (rawError) throw rawError;

        // Process based on data type
        let processedData;
        let tableName: string;

        switch (dataType) {
          case 'orders':
            processedData = await processOrder(supabase, row, mapping, rawImport.id);
            break;
          case 'products':
            processedData = await processProduct(supabase, row, mapping);
            break;
          case 'customers':
            processedData = await processCustomer(supabase, row, mapping);
            break;
          case 'expenses':
            processedData = await processExpense(supabase, row, mapping, user.id, rawImport.id);
            break;
        }

        // Update raw import status
        await supabase
          .from('raw_imports')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', rawImport.id);

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
        console.error(`Error processing row ${i}:`, err);
      }
    }

    console.log(`Import complete: ${results.success} success, ${results.failed} failed`);

    return new Response(JSON.stringify({
      message: 'Import completed',
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processOrder(supabase: any, row: any, mapping?: Record<string, string>, importId?: string) {
  const m = mapping || {};
  
  // Get or create customer
  let customerId = null;
  const customerEmail = row[m.customer_email || 'customer_email'] || row.email || row.customer_email;
  
  if (customerEmail) {
    const { data: existingCustomer } = await supabase
      .from('normalized_customers')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from('normalized_customers')
        .insert({
          email: customerEmail,
          full_name: row[m.customer_name || 'customer_name'] || row.customer_name,
          phone: row[m.customer_phone || 'customer_phone'] || row.phone,
          source_type: 'csv',
        })
        .select()
        .single();
      
      if (newCustomer) customerId = newCustomer.id;
    }
  }

  // Create transaction
  const transactionDate = row[m.date || 'date'] || row.order_date || row.transaction_date || new Date().toISOString();
  const total = parseFloat(row[m.total || 'total'] || row.total || '0');

  const { data: transaction, error } = await supabase
    .from('normalized_transactions')
    .insert({
      external_id: row[m.order_id || 'order_id'] || row.id,
      source_type: 'csv',
      source_import_id: importId,
      transaction_date: transactionDate,
      transaction_type: 'sale',
      subtotal: parseFloat(row[m.subtotal || 'subtotal'] || row.subtotal || total),
      tax_amount: parseFloat(row[m.tax || 'tax'] || row.tax_amount || '0'),
      shipping_amount: parseFloat(row[m.shipping || 'shipping'] || row.shipping_amount || '0'),
      discount_amount: parseFloat(row[m.discount || 'discount'] || row.discount_amount || '0'),
      total: total,
      currency: row[m.currency || 'currency'] || 'ILS',
      customer_id: customerId,
      customer_email: customerEmail,
      customer_name: row[m.customer_name || 'customer_name'] || row.customer_name,
      status: row[m.status || 'status'] || 'completed',
      payment_status: row[m.payment_status || 'payment_status'] || 'paid',
    })
    .select()
    .single();

  if (error) throw error;

  // Process line items if present
  const items = row.items || row.line_items || row.products;
  if (Array.isArray(items)) {
    for (const item of items) {
      await supabase
        .from('normalized_transaction_items')
        .insert({
          transaction_id: transaction.id,
          product_name: item.name || item.product_name,
          sku: item.sku,
          quantity: parseInt(item.quantity || '1'),
          unit_price: parseFloat(item.price || item.unit_price || '0'),
          total_price: parseFloat(item.total || item.line_total || '0'),
        });
    }
  }

  return transaction;
}

async function processProduct(supabase: any, row: any, mapping?: Record<string, string>) {
  const m = mapping || {};
  
  const { data, error } = await supabase
    .from('normalized_products')
    .upsert({
      external_id: row[m.id || 'id'] || row.product_id,
      source_type: 'csv',
      sku: row[m.sku || 'sku'] || row.SKU,
      name: row[m.name || 'name'] || row.product_name,
      description: row[m.description || 'description'],
      category: row[m.category || 'category'],
      cost_price: parseFloat(row[m.cost || 'cost'] || row.cost_price || '0') || null,
      price: parseFloat(row[m.price || 'price'] || row.regular_price || '0'),
      sale_price: parseFloat(row[m.sale_price || 'sale_price'] || '0') || null,
      stock_quantity: parseInt(row[m.stock || 'stock'] || row.stock_quantity || '0'),
      image_url: row[m.image || 'image'] || row.image_url,
    }, {
      onConflict: 'sku',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error && !error.message.includes('duplicate')) throw error;
  return data;
}

async function processCustomer(supabase: any, row: any, mapping?: Record<string, string>) {
  const m = mapping || {};
  const email = row[m.email || 'email'];
  
  if (!email) {
    throw new Error('Email is required for customer');
  }

  const { data, error } = await supabase
    .from('normalized_customers')
    .upsert({
      external_id: row[m.id || 'id'] || row.customer_id,
      source_type: 'csv',
      email: email,
      phone: row[m.phone || 'phone'],
      first_name: row[m.first_name || 'first_name'],
      last_name: row[m.last_name || 'last_name'],
      full_name: row[m.name || 'name'] || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      company: row[m.company || 'company'],
      city: row[m.city || 'city'],
      address_line1: row[m.address || 'address'] || row.address_line1,
    }, {
      onConflict: 'email',
      ignoreDuplicates: false,
    })
    .select()
    .single();

  if (error && !error.message.includes('duplicate')) throw error;
  return data;
}

async function processExpense(supabase: any, row: any, mapping: Record<string, string> | undefined, userId: string, importId?: string) {
  const m = mapping || {};
  
  const { data, error } = await supabase
    .from('normalized_expenses')
    .insert({
      source_import_id: importId,
      expense_date: row[m.date || 'date'] || row.expense_date || new Date().toISOString().split('T')[0],
      category: row[m.category || 'category'] || 'other',
      subcategory: row[m.subcategory || 'subcategory'],
      amount: parseFloat(row[m.amount || 'amount'] || '0'),
      vendor: row[m.vendor || 'vendor'] || row.supplier,
      description: row[m.description || 'description'] || row.notes,
      is_recurring: row[m.recurring || 'recurring'] === 'true' || row.is_recurring === true,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

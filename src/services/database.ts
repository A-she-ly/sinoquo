import { supabase } from '../lib/supabase';
import { Product, CostItem, Supplier } from '../types';
import * as XLSX from 'xlsx';
import { initialProducts } from './mockData';

// Helper to check if Supabase is configured
const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
};

export const databaseService = {
  // Sync Excel Data to Supabase
  async syncExcelData(file: File, supplierId: string): Promise<{ success: boolean; message: string; count: number }> {
    if (!isSupabaseConfigured()) {
      return { success: false, message: 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', count: 0 };
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Remove header row (assuming row 1 is header)
          const rows = jsonData.slice(1);
          
          let processedCount = 0;

          for (const row of rows) {
            // Mapping based on User's Image:
            // A: Description (Product Name/Specs) -> index 0
            // B: 成本CNY -> index 1
            // C: 指导价USD -> index 2
            
            const description = row[0];
            const costCNY = row[1];
            const guideUSD = row[2];

            if (!description) continue;

            // 1. Upsert Product
            // Use description as unique identifier for now (or find by name)
            const { data: productData, error: productError } = await supabase
              .from('products')
              .select('id')
              .eq('name', description)
              .single();

            let productId;

            if (productError && productError.code === 'PGRST116') {
              // Product not found, insert
              const { data: newProduct, error: insertError } = await supabase
                .from('products')
                .insert([{ 
                  name: description, 
                  description: description,
                  specs: description 
                }])
                .select('id')
                .single();
              
              if (insertError) throw insertError;
              productId = newProduct.id;
            } else if (productData) {
              productId = productData.id;
            }

            if (productId) {
              // 2. Insert/Update Cost Item
              // Check if cost item exists for this product and supplier
              const { data: existingCost } = await supabase
                .from('cost_items')
                .select('id')
                .eq('product_id', productId)
                .eq('supplier_id', supplierId)
                .single();

              const costPayload = {
                supplier_id: supplierId,
                product_id: productId,
                cost_price: costCNY || 0,
                currency: 'CNY',
                guide_price_usd: guideUSD || 0,
                effective_date: new Date().toISOString()
              };

              if (existingCost) {
                 await supabase
                  .from('cost_items')
                  .update(costPayload)
                  .eq('id', existingCost.id);
              } else {
                await supabase
                  .from('cost_items')
                  .insert([costPayload]);
              }
              
              processedCount++;
            }
          }

          resolve({ success: true, message: 'Upload successful', count: processedCount });
        } catch (error: any) {
          console.error('Upload failed:', error);
          resolve({ success: false, message: error.message, count: 0 });
        }
      };
      reader.readAsBinaryString(file);
    });
  },

  async getProducts(): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, using mock data');
        return initialProducts;
    }
    
    // Fetch all records with pagination to overcome 1000 limit
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('wk_top_hammer_bits')
        .select('*')
        .range(from, from + step - 1);
        
      if (error) {
        console.error('Error fetching products from Supabase:', error);
        console.warn('Falling back to mock data due to Supabase error');
        return initialProducts;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
        if (data.length < step) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    // Map DB schema to Frontend Type
    // Based on user screenshot: 'product_code'/'Product Code', 'Description', '成本CNY', '指导价USD'
    return allData.map((p: any) => ({
      id: p.product_code || p['product_code'] || p['Product Code'] || String(Math.random()),
      name: p.product_code || p['product_code'] || p['Product Code'] || 'Unknown Product',
      specs: p['Description'] || '', 
      category: p['Product Family'] || p['Category'] || 'Top Hammer', // Map from DB
      description: p['Description'] || '',
      details: p['details'] || p['Details'] || '', // New field mapping
      Tip: p['Tip'] || '', // Map Tip field
      image_url: undefined,
      cost_cny: p['成本CNY'] ? Number(p['成本CNY']) : undefined,
      guide_price_usd: p['指导价USD'] ? Number(p['指导价USD']) : undefined,
      technical_specs: {
        ...(p['KG/p'] ? { 'Weight (KG/p)': p['KG/p'] } : {})
      }
    }));
  },

  async getCostItem(productId: string): Promise<CostItem | undefined> {
    if (!isSupabaseConfigured()) return undefined;

    // 1. Try fetching from the main table first
    const { data: productData, error: productError } = await supabase
      .from('wk_top_hammer_bits')
      .select('*')
      .eq('product_code', productId)
      .single();

    if (!productError && productData) {
       const cost = productData['成本CNY'];
       if (cost) {
         return {
           id: `cost_${productId}`,
           supplier_id: 'default',
           product_id: productId,
           internal_code: productId,
           cost_price: Number(cost),
           currency: 'CNY',
           effective_date: new Date().toISOString()
         };
       }
    }

    return undefined;
  },

  async logQuotationAction(actionType: string, cart: any[], totalAmount: number, itemCount: number) {
    if (!isSupabaseConfigured()) return;

    try {
      const { error } = await supabase
        .from('quotation_logs')
        .insert([{
           action_type: actionType,
           total_amount: totalAmount,
           currency: 'USD',
           item_count: itemCount,
           content_snapshot: cart, // Supabase handles JSON automatically if column is JSONB
           client_info: {
             userAgent: navigator.userAgent,
             timestamp: new Date().toISOString(),
             platform: navigator.platform,
             language: navigator.language
           }
        }]);

      if (error) {
        console.error('Failed to log quotation action:', error);
      } else {
        console.log('Quotation action logged successfully:', actionType);
      }
    } catch (err) {
      console.error('Error logging quotation action:', err);
    }
  },

  async getCustomers() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from('customers').select('*').order('updated_at', { ascending: false });
    if (error) {
      console.error('getCustomers error', error);
      return [];
    }
    return data || [];
  },

  async createCustomer(payload: { name: string; contact?: string }) {
    if (!isSupabaseConfigured()) return undefined;
    const { data, error } = await supabase.from('customers').insert([{
      name: payload.name,
      contact: payload.contact || '',
      updated_at: new Date().toISOString()
    }]).select('*').single();
    if (error) {
      console.error('createCustomer error', error);
      return undefined;
    }
    return data;
  },

  async saveQuoteHistory(params: {
    userId: string;
    customerId?: string;
    customerNew?: { name: string; contact?: string };
    cart: any[];
    margin: number;
    exchangeRate: number;
    currency: string;
  }) {
    if (!isSupabaseConfigured()) return { success: false, message: 'not_configured' };
    try {
      let customerId = params.customerId;
      if (!customerId && params.customerNew?.name) {
        const created = await this.createCustomer({ name: params.customerNew.name, contact: params.customerNew.contact });
        if (!created) return { success: false, message: 'create_customer_failed' };
        customerId = created.id;
      }
      if (!customerId) return { success: false, message: 'no_customer' };

      const totalAmount = params.cart.reduce((sum, item) => {
        const cost = item.costItem?.cost_price || item.cost_cny || 0;
        const calculated = (params.currency === 'USD' && item.guide_price_usd) ? item.guide_price_usd : Number(((cost * params.margin) / params.exchangeRate).toFixed(2));
        const unit = item.custom_price ?? calculated;
        return sum + unit * item.quantity;
      }, 0);

      const { data: header, error: headerErr } = await supabase.from('quote_headers').insert([{
        user_id: params.userId,
        customer_id: customerId,
        margin: params.margin,
        exchange_rate: params.exchangeRate,
        currency: params.currency,
        total_amount: totalAmount,
        item_count: params.cart.length,
        created_at: new Date().toISOString()
      }]).select('*').single();
      if (headerErr || !header) {
        console.error('saveQuote header error', headerErr);
        return { success: false, message: 'insert_header_failed' };
      }

      const items = params.cart.map((item, idx) => {
        const cost = item.costItem?.cost_price || item.cost_cny || 0;
        const calculated = (params.currency === 'USD' && item.guide_price_usd) ? item.guide_price_usd : Number(((cost * params.margin) / params.exchangeRate).toFixed(2));
        const unit = item.custom_price ?? calculated;
        return {
          quote_id: header.id,
          line_no: idx + 1,
          product_code: item.id,
          description: item.custom_description || item.specs || item.name,
          quantity: item.quantity,
          unit_price: unit,
          amount: unit * item.quantity,
          currency: params.currency,
          cost_cny: cost
        };
      });
      const { error: itemsErr } = await supabase.from('quote_items').insert(items);
      if (itemsErr) {
        console.error('saveQuote items error', itemsErr);
        return { success: false, message: 'insert_items_failed' };
      }
      return { success: true, id: header.id };
    } catch (e) {
      console.error('saveQuote exception', e);
      return { success: false, message: 'exception' };
    }
  },

  async getQuoteHeadersByUser(userId: string) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from('quote_headers')
      .select('id, created_at, total_amount, currency, item_count, margin, exchange_rate, customers(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('getQuoteHeadersByUser error', error);
      return [];
    }
    return data || [];
  },

  async getQuoteDetail(quoteId: string) {
    if (!isSupabaseConfigured()) return undefined;
    const { data: header, error: hErr } = await supabase
      .from('quote_headers')
      .select('id, created_at, total_amount, currency, item_count, margin, exchange_rate, customers(name, contact)')
      .eq('id', quoteId)
      .single();
    if (hErr || !header) {
      console.error('getQuoteDetail header error', hErr);
      return undefined;
    }
    const { data: items, error: iErr } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('line_no', { ascending: true });
    if (iErr) {
      console.error('getQuoteDetail items error', iErr);
    }
    return { header, items: items || [] };
  }
};

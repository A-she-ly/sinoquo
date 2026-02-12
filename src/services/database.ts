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
    
    // User specified table name: 'wk_top_hammer_bits'
    const { data, error } = await supabase.from('wk_top_hammer_bits').select('*');
    if (error) {
      console.error('Error fetching products from Supabase:', error);
      console.warn('Falling back to mock data due to Supabase error');
      return initialProducts;
      // We throw the error so the UI can display it
      // throw new Error(`Supabase Error: ${error.message} (Code: ${error.code})`);
    }
    
    // Map DB schema to Frontend Type
    // Based on user screenshot: 'Product Code', 'Description', '成本CNY', '指导价USD'
    return data.map((p: any) => ({
      id: p['Product Code'] || String(Math.random()), // Use Product Code as ID if available
      name: p['Product Code'] || 'Unknown Product', // Show code as name
      specs: p['Description'] || '', 
      category: p['Product Family'] || p['Category'] || 'Top Hammer', // Map from DB
      description: p['Description'] || '',
      details: p['details'] || p['Details'] || '', // New field mapping
      Tip: p['Tip'] || '', // Map Tip field
      image_url: undefined,
      cost_cny: p['成本CNY'] ? Number(p['成本CNY']) : undefined,
      guide_price_usd: p['指导价USD'] ? Number(p['指导价USD']) : undefined,
      technical_specs: {}
    }));
  },

  async getCostItem(productId: string): Promise<CostItem | undefined> {
    if (!isSupabaseConfigured()) return undefined;

    // 1. Try fetching from the main table first
    const { data: productData, error: productError } = await supabase
      .from('wk_top_hammer_bits')
      .select('*')
      .eq('Product Code', productId) // Match by Product Code
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
  }
};

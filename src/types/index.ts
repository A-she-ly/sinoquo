export interface Supplier {
  id: string;
  name: string;
  contact: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  specs: string;
  category: string;
  description?: string;
  image_url?: string;
  details?: string; // Rich text or structured content for product details (images + text)
  Tip?: string; // New field for prominent tips
  cost_cny?: number; // Optional field for list display
  guide_price_usd?: number; // Optional field for list display
  technical_specs?: Record<string, string>;
  attachments?: { name: string; url: string }[];
}

export interface CostItem {
  id: string;
  supplier_id: string;
  product_id: string;
  internal_code: string;
  cost_price: number;
  currency: string;
  effective_date: string;
}

export interface QuotationItem {
  id: string;
  product_id: string;
  name: string;
  specs_summary: string;
  unit_price: number;
  quantity: number;
  amount: number;
  currency: string;
}

export interface Quotation {
  id: string;
  customer_id?: string;
  margin_ratio: number;
  exchange_rate: number;
  total_amount: number;
  currency: string;
  items: QuotationItem[];
  generated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  permissions: string[];
}

-- Create tables for Sinoquo ERP

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Products
-- Using description as a unique key component for now based on Excel structure
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- e.g. "Ø64*T38/T45, regular skirt, gauge: 6-Ø12"
  specs TEXT,
  category TEXT,
  description TEXT, -- Full description from Excel
  image_url TEXT, -- Optional product image URL
  technical_specs JSONB, -- For structured specs if needed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Cost Items
CREATE TABLE IF NOT EXISTS cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  product_id UUID REFERENCES products(id),
  internal_code TEXT,
  cost_price DECIMAL(10, 2) NOT NULL, -- Column B: 成本CNY
  currency TEXT DEFAULT 'CNY',
  guide_price_usd DECIMAL(10, 2), -- Column C: 指导价USD
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow public read/write for MVP/Demo purposes)
-- In production, restrict write access to authorized users
CREATE POLICY "Public read suppliers" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Public insert suppliers" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update suppliers" ON suppliers FOR UPDATE USING (true);

CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public insert products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update products" ON products FOR UPDATE USING (true);

CREATE POLICY "Public read cost_items" ON cost_items FOR SELECT USING (true);
CREATE POLICY "Public insert cost_items" ON cost_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update cost_items" ON cost_items FOR UPDATE USING (true);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    contact_info JSONB,
    UNIQUE(owner_id, name) -- Prevent duplicate client names for the same owner
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policies for clients
CREATE POLICY "Users can view their own clients"
ON clients FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own clients"
ON clients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own clients"
ON clients FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own clients"
ON clients FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- Create order_history table
CREATE TABLE IF NOT EXISTS order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    specs TEXT,
    quantity INTEGER,
    unit_price NUMERIC,
    currency TEXT DEFAULT 'USD',
    order_date DATE,
    source_file TEXT,
    original_product_id TEXT, -- Optional link to products table
    owner_id UUID NOT NULL REFERENCES auth.users(id) -- Denormalized for simpler RLS
);

-- Enable RLS for order_history
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Policies for order_history
CREATE POLICY "Users can view their own clients' order history"
ON order_history FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own clients' order history"
ON order_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own clients' order history"
ON order_history FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own clients' order history"
ON order_history FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

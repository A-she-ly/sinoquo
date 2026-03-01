-- Drop existing table if it exists
DROP TABLE IF EXISTS order_history;

-- Create new order_history table based on "Orders of 2025.xlsx" structure
CREATE TABLE IF NOT EXISTS order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Owner/Client Relationship
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    client_name TEXT NOT NULL, -- Directly storing client name from Excel
    
    -- Core ID Fields (The "Onion" Structure)
    full_reference_id TEXT NOT NULL, -- The main searchable ID
    hidden_quote TEXT,
    hidden_pi TEXT,
    hidden_contract TEXT,
    
    -- Order Details
    order_date DATE,
    product_name TEXT,
    specs TEXT,
    quantity INTEGER,
    unit_price NUMERIC,
    currency TEXT DEFAULT 'USD',
    amount NUMERIC, -- Total amount for this line item
    
    -- Status & Metadata
    status TEXT, -- Quoted / PI Confirmed / Contract Signed
    source_file TEXT -- To track which Excel file this came from
);

-- Enable RLS
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own order history"
ON order_history FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own order history"
ON order_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own order history"
ON order_history FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own order history"
ON order_history FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

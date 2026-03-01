-- Drop existing table if it exists
DROP TABLE IF EXISTS order_history;

-- Create new order_history table based on the Excel file structure
-- Columns: Product Line, Descriptions, Qty, Price, Currency, Sub Amount, PO, PI, Contract, Full_Reference_ID
CREATE TABLE IF NOT EXISTS order_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Owner/Client Relationship (For RLS and logic)
    -- We will default 'owner_id' to the current user on insert if possible, 
    -- but since this is a bulk upload, we might need to handle it differently or rely on RLS.
    -- For now, let's include owner_id as nullable or handle it via a trigger/default if needed.
    -- However, for simple CSV import, Supabase might not let you set owner_id easily unless it's in the CSV.
    -- Let's make it nullable for import, and we can update it later or assume the importer is the owner.
    owner_id UUID REFERENCES auth.users(id),
    
    -- Columns matching Excel Headers EXACTLY (case sensitive usually in Postgres if quoted, but let's use standard naming and map later if needed. 
    -- Actually, Supabase import matches header names. Let's use the exact names or close to it.)
    
    "Product Line" TEXT,
    "Descriptions" TEXT,
    "Qty" INTEGER,
    "Price" NUMERIC,
    "Currency" TEXT,
    "Sub Amount" NUMERIC,
    "PO" TEXT,
    "PI" TEXT,
    "Contract" TEXT,
    "Full_Reference_ID" TEXT,

    -- Extra metadata
    source_file TEXT
);

-- Enable RLS
ALTER TABLE order_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own order history"
ON order_history FOR SELECT
TO authenticated
USING (auth.uid() = owner_id OR owner_id IS NULL); -- Allow viewing if owner is null (temporarily for imported data)

CREATE POLICY "Users can insert their own order history"
ON order_history FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow insert, we will trigger owner_id update or handle it

CREATE POLICY "Users can update their own order history"
ON order_history FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id OR owner_id IS NULL)
WITH CHECK (auth.uid() = owner_id OR owner_id IS NULL);

CREATE POLICY "Users can delete their own order history"
ON order_history FOR DELETE
TO authenticated
USING (auth.uid() = owner_id OR owner_id IS NULL);

-- Trigger to auto-assign owner_id on insert if not provided
CREATE OR REPLACE FUNCTION set_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_owner_id
BEFORE INSERT ON order_history
FOR EACH ROW
EXECUTE FUNCTION set_owner_id();

-- Create quotation_logs table
CREATE TABLE IF NOT EXISTS quotation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    action_type TEXT NOT NULL,
    total_amount NUMERIC,
    currency TEXT DEFAULT 'USD',
    item_count INTEGER,
    content_snapshot JSONB,
    client_info JSONB
);

-- Enable RLS (Row Level Security)
ALTER TABLE quotation_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous inserts (since we don't have auth yet)
-- This allows anyone to insert logs, which is fine for this use case
CREATE POLICY "Allow public insert to quotation_logs"
ON quotation_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Create policy to allow reading logs (optional, maybe only for authenticated users later)
-- For now, let's allow public read so we can verify easily, or maybe restrict it.
-- Let's restrict read to service_role only or authenticated users if we had them.
-- But since we are building a dashboard-like feature later, we might need to read them.
-- For now, let's just allow insert. Reading can be done via Supabase dashboard.

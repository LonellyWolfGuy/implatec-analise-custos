-- CREATE TABLE monthly_inventories
CREATE TABLE monthly_inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  month_year text NOT NULL UNIQUE,
  filename text,
  data jsonb NOT NULL
);

-- Enable RLS
ALTER TABLE monthly_inventories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anon)
CREATE POLICY "Allow anonymous insert" ON monthly_inventories
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anyone to select by id (anon)
CREATE POLICY "Allow anonymous select" ON monthly_inventories
  FOR SELECT TO anon
  USING (true);

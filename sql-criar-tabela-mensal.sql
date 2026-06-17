-- CREATE TABLE monthly_inventories
CREATE TABLE IF NOT EXISTS monthly_inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  month_year text NOT NULL UNIQUE,
  filename text,
  data jsonb NOT NULL
);

-- Enable RLS
ALTER TABLE monthly_inventories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous insert" ON monthly_inventories;
DROP POLICY IF EXISTS "Allow anonymous update" ON monthly_inventories;
DROP POLICY IF EXISTS "Allow anonymous select" ON monthly_inventories;
DROP POLICY IF EXISTS "Allow anonymous delete" ON monthly_inventories;

-- Allow anyone to insert (anon)
CREATE POLICY "Allow anonymous insert" ON monthly_inventories
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anyone to update existing monthly inventories (anon)
CREATE POLICY "Allow anonymous update" ON monthly_inventories
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anyone to select by id (anon)
CREATE POLICY "Allow anonymous select" ON monthly_inventories
  FOR SELECT TO anon
  USING (true);

-- Allow anyone to delete (anon)
CREATE POLICY "Allow anonymous delete" ON monthly_inventories
  FOR DELETE TO anon
  USING (true);

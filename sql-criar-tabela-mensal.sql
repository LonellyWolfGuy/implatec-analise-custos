CREATE TABLE IF NOT EXISTS monthly_inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  month_year text NOT NULL UNIQUE,
  filename text,
  item_count integer DEFAULT 0,
  data jsonb NOT NULL
);

-- Migração rápida para projetos que já têm a tabela:
ALTER TABLE monthly_inventories ADD COLUMN IF NOT EXISTS item_count integer DEFAULT 0;
UPDATE monthly_inventories SET item_count = jsonb_array_length(data) WHERE item_count IS NULL OR item_count = 0;

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

-- CREATE TABLE analyses
CREATE TABLE analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text,
  mes1_name text,
  mes2_name text,
  data jsonb NOT NULL
);

-- Enable RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anon)
CREATE POLICY "Allow anonymous insert" ON analyses
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anyone to select by id (anon)
CREATE POLICY "Allow anonymous select" ON analyses
  FOR SELECT TO anon
  USING (true);

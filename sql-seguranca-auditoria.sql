-- Auditoria e versionamento dos inventarios no Supabase.
-- Execute uma vez no SQL Editor do projeto.

CREATE TABLE IF NOT EXISTS inventory_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inventory_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  month_year text NOT NULL,
  filename text,
  data jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid DEFAULT auth.uid()
);

ALTER TABLE inventory_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read audit" ON inventory_audit;
CREATE POLICY "Authenticated users can read audit" ON inventory_audit
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION audit_monthly_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO inventory_audit (inventory_id, action, month_year, filename, data)
    VALUES (OLD.id, TG_OP, OLD.month_year, OLD.filename, OLD.data);
    RETURN OLD;
  END IF;

  INSERT INTO inventory_audit (inventory_id, action, month_year, filename, data)
  VALUES (NEW.id, TG_OP, NEW.month_year, NEW.filename, NEW.data);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monthly_inventory_audit_trigger ON monthly_inventories;
CREATE TRIGGER monthly_inventory_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON monthly_inventories
FOR EACH ROW EXECUTE FUNCTION audit_monthly_inventory();

-- Depois que o login estiver habilitado na aplicacao, substitua as policies
-- anonimas de escrita por policies para authenticated. Nao execute este bloco
-- antes disso, ou usuarios atuais perderao acesso a gravacao.
-- DROP POLICY IF EXISTS "Allow anonymous insert" ON monthly_inventories;
-- DROP POLICY IF EXISTS "Allow anonymous update" ON monthly_inventories;
-- DROP POLICY IF EXISTS "Allow anonymous delete" ON monthly_inventories;
-- CREATE POLICY "Authenticated insert" ON monthly_inventories FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Authenticated update" ON monthly_inventories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "Authenticated delete" ON monthly_inventories FOR DELETE TO authenticated USING (true);
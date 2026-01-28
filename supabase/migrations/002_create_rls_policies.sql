ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "units_select" ON units
  FOR SELECT
  USING (true);

CREATE POLICY "units_admin_all" ON units
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "material_categories_select" ON material_categories
  FOR SELECT
  USING (true);

CREATE POLICY "material_categories_admin_all" ON material_categories
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT
  USING (true);

CREATE POLICY "suppliers_manage_all" ON suppliers
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "materials_select" ON materials
  FOR SELECT
  USING (true);

CREATE POLICY "materials_manage_all" ON materials
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "material_codes_select" ON material_codes
  FOR SELECT
  USING (true);

CREATE POLICY "material_codes_manage_all" ON material_codes
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "material_batches_select" ON material_batches
  FOR SELECT
  USING (true);

CREATE POLICY "material_batches_manage_all" ON material_batches
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "material_batches_operator_insert" ON material_batches
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'));

CREATE POLICY "material_batches_operator_update" ON material_batches
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'));

CREATE POLICY "barcodes_select" ON barcodes
  FOR SELECT
  USING (true);

CREATE POLICY "barcodes_manage_all" ON barcodes
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "barcodes_operator_insert" ON barcodes
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'));

CREATE POLICY "barcodes_operator_update" ON barcodes
  FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'));

CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT
  USING (true);

CREATE POLICY "audit_logs_admin_all" ON audit_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

GRANT SELECT ON units TO anon;
GRANT SELECT ON material_categories TO anon;
GRANT SELECT ON suppliers TO anon;
GRANT SELECT ON materials TO anon;
GRANT SELECT ON material_codes TO anon;
GRANT SELECT ON material_batches TO anon;
GRANT SELECT ON barcodes TO anon;
GRANT SELECT ON audit_logs TO anon;

GRANT ALL ON units TO authenticated;
GRANT ALL ON material_categories TO authenticated;
GRANT ALL ON suppliers TO authenticated;
GRANT ALL ON materials TO authenticated;
GRANT ALL ON material_codes TO authenticated;
GRANT ALL ON material_batches TO authenticated;
GRANT ALL ON barcodes TO authenticated;
GRANT ALL ON audit_logs TO authenticated;

CREATE OR REPLACE FUNCTION check_user_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data ->> 'role' = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT raw_user_meta_data ->> 'role' INTO user_role
  FROM auth.users
  WHERE id = auth.uid();

  RETURN CASE
    WHEN user_role = 'admin' THEN true
    WHEN user_role = 'manager' AND permission IN ('read', 'write', 'delete') THEN true
    WHEN user_role = 'operator' AND permission IN ('read', 'write') THEN true
    WHEN user_role = 'viewer' AND permission = 'read' THEN true
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_stock_availability(material_id UUID, required_quantity DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  available_stock DECIMAL;
BEGIN
  SELECT current_stock INTO available_stock
  FROM materials
  WHERE id = material_id;

  RETURN available_stock >= required_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_batch_expiry()
RETURNS VOID AS $$
BEGIN
  UPDATE material_batches
  SET status = 'expired'
  WHERE expiry_date < CURRENT_DATE
    AND status = 'available';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_barcode(
  material_code TEXT,
  batch_number TEXT DEFAULT NULL,
  barcode_type TEXT DEFAULT 'code128'
)
RETURNS TEXT AS $$
DECLARE
  barcode_text TEXT;
  timestamp_str TEXT;
BEGIN
  timestamp_str := TO_CHAR(NOW(), 'YYYYMMDDHH24MISSMS');

  IF batch_number IS NOT NULL THEN
    barcode_text := material_code || '-' || batch_number || '-' || timestamp_str;
  ELSE
    barcode_text := material_code || '-' || timestamp_str;
  END IF;

  RETURN barcode_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_batch_number(material_id UUID)
RETURNS TEXT AS $$
DECLARE
  material_code TEXT;
  date_str TEXT;
  sequence_num TEXT;
BEGIN
  SELECT code INTO material_code
  FROM materials
  WHERE id = material_id;

  date_str := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT LPAD((COUNT(*) + 1)::TEXT, 3, '0') INTO sequence_num
  FROM material_batches
  WHERE material_id = generate_batch_number.material_id
    AND batch_number LIKE material_code || date_str || '%';

  RETURN material_code || date_str || sequence_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

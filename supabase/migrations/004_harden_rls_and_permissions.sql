CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    auth.jwt() ->> 'role'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT
    (auth.jwt() ->> 'role' = 'anon')
    OR EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = auth.uid()
        AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION check_user_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT public.current_user_role() = required_role;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION has_permission(permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  IF NOT public.is_active_user() THEN
    RETURN FALSE;
  END IF;

  user_role := COALESCE(public.current_user_role(), 'viewer');

  IF user_role IN ('admin', 'anon') THEN
    RETURN TRUE;
  END IF;

  RETURN CASE
    WHEN permission = 'read' THEN user_role IN ('manager', 'operator', 'viewer')
    WHEN permission = 'write' THEN user_role IN ('manager', 'operator')
    WHEN permission = 'delete' THEN user_role IN ('manager')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

ALTER TABLE IF EXISTS units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS material_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS db_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "units_select" ON units;
DROP POLICY IF EXISTS "units_admin_all" ON units;
DROP POLICY IF EXISTS "material_categories_select" ON material_categories;
DROP POLICY IF EXISTS "material_categories_admin_all" ON material_categories;
DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
DROP POLICY IF EXISTS "suppliers_manage_all" ON suppliers;
DROP POLICY IF EXISTS "materials_select" ON materials;
DROP POLICY IF EXISTS "materials_manage_all" ON materials;
DROP POLICY IF EXISTS "material_codes_select" ON material_codes;
DROP POLICY IF EXISTS "material_codes_manage_all" ON material_codes;
DROP POLICY IF EXISTS "material_batches_select" ON material_batches;
DROP POLICY IF EXISTS "material_batches_manage_all" ON material_batches;
DROP POLICY IF EXISTS "material_batches_operator_insert" ON material_batches;
DROP POLICY IF EXISTS "material_batches_operator_update" ON material_batches;
DROP POLICY IF EXISTS "barcodes_select" ON barcodes;
DROP POLICY IF EXISTS "barcodes_manage_all" ON barcodes;
DROP POLICY IF EXISTS "barcodes_operator_insert" ON barcodes;
DROP POLICY IF EXISTS "barcodes_operator_update" ON barcodes;
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_admin_all" ON audit_logs;

CREATE POLICY "units_select_authenticated" ON units
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "units_admin_write" ON units
  FOR ALL
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'anon'));

CREATE POLICY "categories_select_authenticated" ON material_categories
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "categories_admin_write" ON material_categories
  FOR ALL
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'anon'));

CREATE POLICY "suppliers_select_authenticated" ON suppliers
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "suppliers_admin_manager_write" ON suppliers
  FOR ALL
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'));

CREATE POLICY "materials_select_authenticated" ON materials
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "materials_insert" ON materials
  FOR INSERT
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'));
CREATE POLICY "materials_update" ON materials
  FOR UPDATE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'));
CREATE POLICY "materials_delete" ON materials
  FOR DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'));

CREATE POLICY "material_codes_select_authenticated" ON material_codes
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "material_codes_admin_manager_write" ON material_codes
  FOR ALL
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'));

CREATE POLICY "batches_select_authenticated" ON material_batches
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "batches_insert" ON material_batches
  FOR INSERT
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'));
CREATE POLICY "batches_update" ON material_batches
  FOR UPDATE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'));
CREATE POLICY "batches_delete" ON material_batches
  FOR DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'));

CREATE POLICY "barcodes_select_authenticated" ON barcodes
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "barcodes_insert" ON barcodes
  FOR INSERT
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'));
CREATE POLICY "barcodes_update" ON barcodes
  FOR UPDATE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator', 'anon'));
CREATE POLICY "barcodes_delete" ON barcodes
  FOR DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'));

CREATE POLICY "users_select_self_or_admin_manager" ON users
  FOR SELECT
  USING (
    public.is_active_user()
    AND (
      id = auth.uid()
      OR public.current_user_role() IN ('admin', 'manager')
    )
  );

CREATE POLICY "users_admin_manager_update" ON users
  FOR UPDATE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

CREATE POLICY "settings_select_admin_manager" ON system_settings
  FOR SELECT
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'));

CREATE POLICY "settings_admin_write" ON system_settings
  FOR ALL
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'anon'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'anon'));

CREATE POLICY "app_audit_logs_select_admin_manager" ON audit_logs
  FOR SELECT
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'anon'));

CREATE POLICY "app_audit_logs_insert_self" ON audit_logs
  FOR INSERT
  WITH CHECK (
    public.is_active_user()
    AND (user_id = auth.uid() OR public.current_user_role() = 'anon')
  );

CREATE POLICY "db_audit_logs_select_admin" ON db_audit_logs
  FOR SELECT
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'anon'));

GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON units FROM anon, authenticated;
REVOKE ALL ON material_categories FROM anon, authenticated;
REVOKE ALL ON suppliers FROM anon, authenticated;
REVOKE ALL ON materials FROM anon, authenticated;
REVOKE ALL ON material_codes FROM anon, authenticated;
REVOKE ALL ON material_batches FROM anon, authenticated;
REVOKE ALL ON barcodes FROM anon, authenticated;
REVOKE ALL ON users FROM anon, authenticated;
REVOKE ALL ON system_settings FROM anon, authenticated;
REVOKE ALL ON audit_logs FROM anon, authenticated;
REVOKE ALL ON db_audit_logs FROM anon, authenticated;

GRANT SELECT ON units TO authenticated;
GRANT SELECT ON material_categories TO authenticated;
GRANT SELECT ON suppliers TO authenticated;
GRANT SELECT ON materials TO authenticated;
GRANT SELECT ON material_codes TO authenticated;
GRANT SELECT ON material_batches TO authenticated;
GRANT SELECT ON barcodes TO authenticated;
GRANT SELECT ON users TO authenticated;
GRANT SELECT ON system_settings TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON db_audit_logs TO authenticated;

GRANT INSERT, UPDATE, DELETE ON suppliers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON units TO authenticated;
GRANT INSERT, UPDATE, DELETE ON material_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON materials TO authenticated;
GRANT INSERT, UPDATE, DELETE ON material_codes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON material_batches TO authenticated;
GRANT INSERT, UPDATE, DELETE ON barcodes TO authenticated;
GRANT UPDATE ON users TO authenticated;
GRANT INSERT, UPDATE, DELETE ON system_settings TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON units TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON material_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON suppliers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON materials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON material_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON material_batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON barcodes TO anon;
GRANT SELECT, INSERT ON audit_logs TO anon;
GRANT SELECT ON system_settings TO anon;

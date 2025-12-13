-- 生产环境权限加固（RLS + 授权）
-- 目的：
-- 1) 修正 002 中使用 auth.jwt()->>'role' 导致的权限失效问题
-- 2) 禁止 anon 直接读取业务数据
-- 3) 以 public.users.role 作为应用角色来源，统一控制读写权限

-- =============================================================================
-- 0) 角色辅助函数（SECURITY DEFINER，避免 users 表策略递归）
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 是否为“可用用户”（用于在 RLS 层面直接拦截被禁用/停用的账号访问）
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 兼容 002 中的函数名：统一改为读取 public.users.role（避免依赖 user_metadata）
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

  IF user_role = 'admin' THEN
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

-- =============================================================================
-- 1) 开启/确认 RLS
-- =============================================================================
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

-- =============================================================================
-- 2) 清理旧策略（来自 002）
-- =============================================================================
DROP POLICY IF EXISTS "允许所有用户查看单位" ON units;
DROP POLICY IF EXISTS "允许管理员管理单位" ON units;

DROP POLICY IF EXISTS "允许所有用户查看物料分类" ON material_categories;
DROP POLICY IF EXISTS "允许管理员管理物料分类" ON material_categories;

DROP POLICY IF EXISTS "允许所有用户查看供应商" ON suppliers;
DROP POLICY IF EXISTS "允许管理员和经理管理供应商" ON suppliers;

DROP POLICY IF EXISTS "允许所有用户查看物料" ON materials;
DROP POLICY IF EXISTS "允许管理员和经理管理物料" ON materials;

DROP POLICY IF EXISTS "允许所有用户查看物料编码" ON material_codes;
DROP POLICY IF EXISTS "允许管理员和经理管理物料编码" ON material_codes;

DROP POLICY IF EXISTS "允许所有用户查看物料批次" ON material_batches;
DROP POLICY IF EXISTS "允许管理员和经理管理物料批次" ON material_batches;
DROP POLICY IF EXISTS "允许操作员创建和更新物料批次" ON material_batches;

DROP POLICY IF EXISTS "允许所有用户查看条码" ON barcodes;
DROP POLICY IF EXISTS "允许管理员和经理管理条码" ON barcodes;
DROP POLICY IF EXISTS "允许操作员创建和更新条码" ON barcodes;

-- 旧“审计日志表策略”在 003 中已改为 db_audit_logs
DROP POLICY IF EXISTS "允许所有用户查看审计日志" ON db_audit_logs;
DROP POLICY IF EXISTS "允许管理员管理审计日志" ON db_audit_logs;

-- =============================================================================
-- 3) 新策略（按前端权限模型：admin/manager/operator/viewer）
-- =============================================================================

-- ---- units / material_categories：所有登录用户可读，只有 admin 可改
CREATE POLICY "units_select_authenticated" ON units
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "units_admin_write" ON units
  FOR INSERT, UPDATE, DELETE
  USING (public.is_active_user() AND public.current_user_role() = 'admin')
  WITH CHECK (public.is_active_user() AND public.current_user_role() = 'admin');

CREATE POLICY "categories_select_authenticated" ON material_categories
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "categories_admin_write" ON material_categories
  FOR INSERT, UPDATE, DELETE
  USING (public.is_active_user() AND public.current_user_role() = 'admin')
  WITH CHECK (public.is_active_user() AND public.current_user_role() = 'admin');

-- ---- suppliers：所有登录用户可读；admin/manager 可写删
CREATE POLICY "suppliers_select_authenticated" ON suppliers
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "suppliers_admin_manager_write" ON suppliers
  FOR INSERT, UPDATE, DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

-- ---- materials：所有登录用户可读；admin/manager/operator 可写；admin/manager 可删
CREATE POLICY "materials_select_authenticated" ON materials
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "materials_write" ON materials
  FOR INSERT, UPDATE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator'));
CREATE POLICY "materials_delete" ON materials
  FOR DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

-- ---- material_codes：所有登录用户可读；admin/manager 可写删
CREATE POLICY "material_codes_select_authenticated" ON material_codes
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "material_codes_admin_manager_write" ON material_codes
  FOR INSERT, UPDATE, DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

-- ---- material_batches：所有登录用户可读；admin/manager/operator 可写；admin/manager 可删
CREATE POLICY "batches_select_authenticated" ON material_batches
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "batches_write" ON material_batches
  FOR INSERT, UPDATE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator'));
CREATE POLICY "batches_delete" ON material_batches
  FOR DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

-- ---- barcodes：所有登录用户可读；admin/manager/operator 可写；admin/manager 可删
CREATE POLICY "barcodes_select_authenticated" ON barcodes
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "barcodes_write" ON barcodes
  FOR INSERT, UPDATE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator'))
  WITH CHECK (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager', 'operator'));
CREATE POLICY "barcodes_delete" ON barcodes
  FOR DELETE
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

-- ---- users：本人可读自身；admin/manager 可读全量；admin/manager 可更新（用户管理页面需要）
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

-- ---- system_settings：admin/manager 可读；仅 admin 可改（写入由管理员完成；DB 侧建议预置一条默认记录）
CREATE POLICY "settings_select_admin_manager" ON system_settings
  FOR SELECT
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

CREATE POLICY "settings_admin_write" ON system_settings
  FOR INSERT, UPDATE, DELETE
  USING (public.is_active_user() AND public.current_user_role() = 'admin')
  WITH CHECK (public.is_active_user() AND public.current_user_role() = 'admin');

-- ---- audit_logs（应用层）：admin/manager 可读；所有登录用户可写入自身日志（user_id 必须等于 auth.uid）
CREATE POLICY "app_audit_logs_select_admin_manager" ON audit_logs
  FOR SELECT
  USING (public.is_active_user() AND public.current_user_role() IN ('admin', 'manager'));

CREATE POLICY "app_audit_logs_insert_self" ON audit_logs
  FOR INSERT
  WITH CHECK (
    public.is_active_user()
    AND user_id = auth.uid()
  );

-- ---- db_audit_logs（触发器审计）：仅 admin 可读
CREATE POLICY "db_audit_logs_select_admin" ON db_audit_logs
  FOR SELECT
  USING (public.is_active_user() AND public.current_user_role() = 'admin');

-- =============================================================================
-- 4) 授权收口：撤销 anon 的业务表权限；authenticated 仅保留需要的权限（RLS 继续兜底）
-- =============================================================================

-- schema 使用权（保持默认）
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 先撤销旧授权（002 中对 anon 的 SELECT / authenticated 的 ALL）
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

-- authenticated：允许访问业务表（具体能否操作由 RLS 决定）
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

-- anon：不授予任何业务表权限（登录后才可访问）

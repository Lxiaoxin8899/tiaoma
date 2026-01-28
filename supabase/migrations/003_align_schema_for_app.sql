ALTER TABLE IF EXISTS material_batches
  ADD COLUMN IF NOT EXISTS remarks TEXT;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(200),
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  department VARCHAR(100),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  computed_username TEXT;
  computed_email TEXT;
  initial_role TEXT;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.users) INTO is_first_user;

  computed_username := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    split_part(COALESCE(NEW.email, 'user@local'), '@', 1)
  );

  IF computed_username IS NULL OR computed_username = '' THEN
    computed_username := 'user';
  END IF;

  computed_username := computed_username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  computed_email := COALESCE(NEW.email, computed_username || '@local');
  initial_role := CASE WHEN is_first_user THEN 'admin' ELSE 'viewer' END;

  INSERT INTO public.users (id, email, username, role, status, created_at, updated_at)
  VALUES (NEW.id, computed_email, computed_username, initial_role, 'active', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  language TEXT NOT NULL DEFAULT 'zh-CN',
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  password_min_length INTEGER NOT NULL DEFAULT 8,
  session_timeout INTEGER NOT NULL DEFAULT 480,
  max_login_attempts INTEGER NOT NULL DEFAULT 5,
  two_factor_required BOOLEAN NOT NULL DEFAULT FALSE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  low_stock_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  system_maintenance BOOLEAN NOT NULL DEFAULT FALSE,
  user_activities BOOLEAN NOT NULL DEFAULT TRUE,
  auto_backup BOOLEAN NOT NULL DEFAULT TRUE,
  backup_frequency TEXT NOT NULL DEFAULT 'daily',
  data_retention_days INTEGER NOT NULL DEFAULT 365,
  maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_system_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO system_settings (
  site_name,
  company_name,
  timezone,
  language,
  date_format,
  password_min_length,
  session_timeout,
  max_login_attempts,
  two_factor_required,
  email_enabled,
  low_stock_alerts,
  system_maintenance,
  user_activities,
  auto_backup,
  backup_frequency,
  data_retention_days,
  maintenance_mode
)
SELECT
  'Material Management System',
  'Company',
  'Asia/Shanghai',
  'zh-CN',
  'YYYY-MM-DD',
  8,
  480,
  5,
  FALSE,
  TRUE,
  TRUE,
  FALSE,
  TRUE,
  TRUE,
  'daily',
  365,
  FALSE
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'db_audit_logs'
  ) THEN
    ALTER TABLE public.audit_logs RENAME TO db_audit_logs;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO db_audit_logs (table_name, record_id, action, old_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO db_audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO db_audit_logs (table_name, record_id, action, new_values, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout')),
  module VARCHAR(20) NOT NULL CHECK (module IN ('material', 'supplier', 'batch', 'barcode', 'user', 'settings', 'auth')),
  target_id TEXT,
  target_name TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_app_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_app_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_app_audit_logs_action ON audit_logs(action);

-- 行级安全策略 (RLS)

-- 启用所有表的RLS
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 单位表策略
CREATE POLICY "允许所有用户查看单位" ON units
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员管理单位" ON units
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 物料分类表策略
CREATE POLICY "允许所有用户查看物料分类" ON material_categories
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员管理物料分类" ON material_categories
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 供应商表策略
CREATE POLICY "允许所有用户查看供应商" ON suppliers
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员和经理管理供应商" ON suppliers
    FOR ALL
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- 物料表策略
CREATE POLICY "允许所有用户查看物料" ON materials
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员和经理管理物料" ON materials
    FOR ALL
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- 物料编码表策略
CREATE POLICY "允许所有用户查看物料编码" ON material_codes
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员和经理管理物料编码" ON material_codes
    FOR ALL
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- 物料批次表策略
CREATE POLICY "允许所有用户查看物料批次" ON material_batches
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员和经理管理物料批次" ON material_batches
    FOR ALL
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "允许操作员创建和更新物料批次" ON material_batches
    FOR INSERT, UPDATE
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'));

-- 条码表策略
CREATE POLICY "允许所有用户查看条码" ON barcodes
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员和经理管理条码" ON barcodes
    FOR ALL
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

CREATE POLICY "允许操作员创建和更新条码" ON barcodes
    FOR INSERT, UPDATE
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager', 'operator'));

-- 审计日志表策略
CREATE POLICY "允许所有用户查看审计日志" ON audit_logs
    FOR SELECT
    USING (true);

CREATE POLICY "允许管理员管理审计日志" ON audit_logs
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- 授权策略
-- 授予anon角色基础查询权限
GRANT SELECT ON units TO anon;
GRANT SELECT ON material_categories TO anon;
GRANT SELECT ON suppliers TO anon;
GRANT SELECT ON materials TO anon;
GRANT SELECT ON material_codes TO anon;
GRANT SELECT ON material_batches TO anon;
GRANT SELECT ON barcodes TO anon;
GRANT SELECT ON audit_logs TO anon;

-- 授予authenticated角色完整权限
GRANT ALL ON units TO authenticated;
GRANT ALL ON material_categories TO authenticated;
GRANT ALL ON suppliers TO authenticated;
GRANT ALL ON materials TO authenticated;
GRANT ALL ON material_codes TO authenticated;
GRANT ALL ON material_batches TO authenticated;
GRANT ALL ON barcodes TO authenticated;
GRANT ALL ON audit_logs TO authenticated;

-- 创建角色检查函数
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

-- 创建权限检查函数
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

-- 创建库存检查函数
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

-- 创建批次过期检查函数
CREATE OR REPLACE FUNCTION check_batch_expiry()
RETURNS VOID AS $$
BEGIN
    UPDATE material_batches 
    SET status = 'expired'
    WHERE expiry_date < CURRENT_DATE 
    AND status = 'available';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建条码生成函数
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

-- 创建批次号生成函数
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
    
    -- 获取当天的序列号
    SELECT LPAD(COALESCE(MAX(SUBSTRING(batch_number FROM LENGTH(material_code || date_str) + 2 FOR 3)), '0')::INT + 1::TEXT, 3, '0')
    INTO sequence_num
    FROM material_batches 
    WHERE material_id = generate_batch_number.material_id 
    AND batch_number LIKE material_code || date_str || '%';
    
    RETURN material_code || date_str || sequence_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
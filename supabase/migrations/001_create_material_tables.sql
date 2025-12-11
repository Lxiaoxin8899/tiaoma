-- 物料管理与条码生成系统数据库结构

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 单位表
CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('weight', 'volume', 'length', 'area', 'piece', 'other')),
    conversion_factor DECIMAL(10,6) DEFAULT 1.0,
    base_unit VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 物料分类表
CREATE TABLE material_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES material_categories(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 供应商表
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 物料表
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    specification TEXT,
    unit_id UUID NOT NULL REFERENCES units(id),
    category_id UUID NOT NULL REFERENCES material_categories(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    description TEXT,
    min_stock DECIMAL(10,2) DEFAULT 0,
    max_stock DECIMAL(10,2) DEFAULT 0,
    current_stock DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 物料编码表
CREATE TABLE material_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('internal', 'supplier', 'customer', 'barcode')),
    is_primary BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(material_id, code, code_type)
);

-- 物料批次表
CREATE TABLE material_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) NOT NULL,
    production_date DATE,
    expiry_date DATE,
    supplier_id UUID REFERENCES suppliers(id),
    quantity DECIMAL(10,2) NOT NULL,
    remaining_quantity DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'locked', 'expired', 'disposed')),
    location VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(material_id, batch_number)
);

-- 条码表
CREATE TABLE barcodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES material_batches(id) ON DELETE CASCADE,
    barcode VARCHAR(200) NOT NULL,
    barcode_type VARCHAR(20) NOT NULL CHECK (barcode_type IN ('code128', 'qr_code', 'ean13', 'upc')),
    format VARCHAR(20) NOT NULL,
    width INTEGER DEFAULT 200,
    height INTEGER DEFAULT 100,
    data TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    print_count INTEGER DEFAULT 0,
    last_printed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 审计日志表
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 创建索引
CREATE INDEX idx_materials_code ON materials(code);
CREATE INDEX idx_materials_name ON materials(name);
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_status ON materials(status);
CREATE INDEX idx_material_codes_material ON material_codes(material_id);
CREATE INDEX idx_material_codes_code ON material_codes(code);
CREATE INDEX idx_material_batches_material ON material_batches(material_id);
CREATE INDEX idx_material_batches_batch_number ON material_batches(batch_number);
CREATE INDEX idx_material_batches_status ON material_batches(status);
CREATE INDEX idx_material_batches_expiry ON material_batches(expiry_date);
CREATE INDEX idx_barcodes_material ON barcodes(material_id);
CREATE INDEX idx_barcodes_batch ON barcodes(batch_id);
CREATE INDEX idx_barcodes_barcode ON barcodes(barcode);
CREATE INDEX idx_barcodes_type ON barcodes(barcode_type);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新updated_at的表创建触发器
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_categories_updated_at BEFORE UPDATE ON material_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_batches_updated_at BEFORE UPDATE ON material_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建审计日志触发器函数
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 为所有业务表创建审计日志触发器
CREATE TRIGGER audit_materials AFTER INSERT OR UPDATE OR DELETE ON materials
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_material_categories AFTER INSERT OR UPDATE OR DELETE ON material_categories
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_units AFTER INSERT OR UPDATE OR DELETE ON units
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_material_codes AFTER INSERT OR UPDATE OR DELETE ON material_codes
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_material_batches AFTER INSERT OR UPDATE OR DELETE ON material_batches
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_barcodes AFTER INSERT OR UPDATE OR DELETE ON barcodes
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- 创建库存更新函数
CREATE OR REPLACE FUNCTION update_material_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE materials 
        SET current_stock = current_stock + NEW.remaining_quantity
        WHERE id = NEW.material_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE materials 
        SET current_stock = current_stock - OLD.remaining_quantity + NEW.remaining_quantity
        WHERE id = NEW.material_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE materials 
        SET current_stock = current_stock - OLD.remaining_quantity
        WHERE id = OLD.material_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 为批次表创建库存更新触发器
CREATE TRIGGER update_material_stock_trigger AFTER INSERT OR UPDATE OR DELETE ON material_batches
    FOR EACH ROW EXECUTE FUNCTION update_material_stock();

-- 插入基础数据
INSERT INTO units (code, name, symbol, category, created_by) VALUES
('PCS', '件', '件', 'piece', (SELECT id FROM auth.users LIMIT 1)),
('KG', '千克', 'kg', 'weight', (SELECT id FROM auth.users LIMIT 1)),
('G', '克', 'g', 'weight', (SELECT id FROM auth.users LIMIT 1)),
('L', '升', 'L', 'volume', (SELECT id FROM auth.users LIMIT 1)),
('ML', '毫升', 'ml', 'volume', (SELECT id FROM auth.users LIMIT 1)),
('M', '米', 'm', 'length', (SELECT id FROM auth.users LIMIT 1)),
('M2', '平方米', 'm²', 'area', (SELECT id FROM auth.users LIMIT 1));

INSERT INTO material_categories (code, name, created_by) VALUES
('ELEC', '电子元器件', (SELECT id FROM auth.users LIMIT 1)),
('MECH', '机械配件', (SELECT id FROM auth.users LIMIT 1)),
('CHEM', '化工原料', (SELECT id FROM auth.users LIMIT 1)),
('PACK', '包装材料', (SELECT id FROM auth.users LIMIT 1)),
('TOOL', '工具', (SELECT id FROM auth.users LIMIT 1));
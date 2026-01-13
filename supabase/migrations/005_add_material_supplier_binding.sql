-- 为物料增加默认供应商绑定（一个物料编码对应一个供应商）
-- 目的：
-- 1) 新建批次时自动继承供应商，避免每次重复选择
-- 2) 打印条码/标签时能稳定带出供应商信息

ALTER TABLE IF EXISTS materials
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);

COMMENT ON COLUMN materials.supplier_id IS '物料默认供应商（一个物料编码对应一个供应商）';


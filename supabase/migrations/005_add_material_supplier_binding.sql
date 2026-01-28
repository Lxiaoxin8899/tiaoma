ALTER TABLE IF EXISTS materials
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);

-- Seed base material categories for initial usage
INSERT INTO public.material_categories (code, name, description)
VALUES
  ('RAW', '原料', '基础原料'),
  ('PACK', '包装', '包装材料'),
  ('FIN', '成品', '成品物料')
ON CONFLICT (code) DO NOTHING;

-- Seed base units so material creation has selectable options
INSERT INTO public.units (code, name, symbol, category, conversion_factor, base_unit)
VALUES
  ('PCS', '件', '件', 'piece', 1, 'PCS'),
  ('KG', '千克', 'kg', 'weight', 1, 'KG'),
  ('G', '克', 'g', 'weight', 0.001, 'KG'),
  ('L', '升', 'L', 'volume', 1, 'L'),
  ('ML', '毫升', 'mL', 'volume', 0.001, 'L')
ON CONFLICT (code) DO NOTHING;

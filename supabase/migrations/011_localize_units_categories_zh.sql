-- Update existing units and categories to Chinese display names
UPDATE public.units
SET name = CASE code
  WHEN 'PCS' THEN '件'
  WHEN 'KG' THEN '千克'
  WHEN 'G' THEN '克'
  WHEN 'L' THEN '升'
  WHEN 'ML' THEN '毫升'
  ELSE name
END,
  symbol = CASE code
    WHEN 'PCS' THEN '件'
    WHEN 'KG' THEN 'kg'
    WHEN 'G' THEN 'g'
    WHEN 'L' THEN 'L'
    WHEN 'ML' THEN 'mL'
    ELSE symbol
  END
WHERE code IN ('PCS', 'KG', 'G', 'L', 'ML');

UPDATE public.material_categories
SET name = CASE code
  WHEN 'RAW' THEN '原料'
  WHEN 'PACK' THEN '包装'
  WHEN 'FIN' THEN '成品'
  ELSE name
END,
  description = CASE code
    WHEN 'RAW' THEN '基础原料'
    WHEN 'PACK' THEN '包装材料'
    WHEN 'FIN' THEN '成品物料'
    ELSE description
  END
WHERE code IN ('RAW', 'PACK', 'FIN');

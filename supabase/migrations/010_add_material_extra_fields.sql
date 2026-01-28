-- Align materials columns with UI payload
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS weight text,
  ADD COLUMN IF NOT EXISTS storage_conditions text,
  ADD COLUMN IF NOT EXISTS main_ingredients text,
  ADD COLUMN IF NOT EXISTS shelf_life text;

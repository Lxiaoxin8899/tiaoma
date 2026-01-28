-- Add remarks column for suppliers to match UI payload
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS remarks text;

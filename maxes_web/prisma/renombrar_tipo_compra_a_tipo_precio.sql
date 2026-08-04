DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pedido_web'
      AND column_name = 'tipo_compra'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pedido_web'
      AND column_name = 'tipo_precio'
  ) THEN
    ALTER TABLE pedido_web RENAME COLUMN tipo_compra TO tipo_precio;
  END IF;
END $$;

ALTER TABLE pedido_web
  ADD COLUMN IF NOT EXISTS tipo_precio VARCHAR(20);

COMMENT ON COLUMN pedido_web.tipo_precio IS
  'Modalidad de precio aplicada al pedido: mayorista o minorista.';

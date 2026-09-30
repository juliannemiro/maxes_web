-- Separa la marca comercial del proveedor operativo.
-- proveedor_des se conserva por compatibilidad histórica, pero ya no se publica.
ALTER TABLE IF EXISTS "articulo_web"
  ADD COLUMN IF NOT EXISTS "marca_des" VARCHAR(20);

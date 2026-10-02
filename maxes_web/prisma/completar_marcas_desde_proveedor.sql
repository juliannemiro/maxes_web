-- Compatibilidad para catálogos anteriores a la separación marca/proveedor.
-- Sólo completa marcas que todavía no fueron cargadas explícitamente.
UPDATE articulo_web
SET marca_des = LEFT(BTRIM(proveedor_des), 20)
WHERE COALESCE(BTRIM(marca_des), '') = ''
  AND COALESCE(BTRIM(proveedor_des), '') <> '';

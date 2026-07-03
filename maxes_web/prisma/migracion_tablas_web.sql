BEGIN;

ALTER TABLE IF EXISTS "rubro" RENAME TO "rubro_web";
ALTER TABLE IF EXISTS "articulo" RENAME TO "articulo_web";
ALTER TABLE IF EXISTS "pedido" RENAME TO "pedido_web";
ALTER TABLE IF EXISTS "pedido_detalle" RENAME TO "pedido_detalle_web";
ALTER TABLE IF EXISTS "imagen_articulo" RENAME TO "articulo_imagen_web";
ALTER TABLE IF EXISTS "carrusel_home" RENAME TO "carrusel_home_web";
ALTER TABLE IF EXISTS "configuracion" RENAME TO "configuracion_web";

ALTER TABLE IF EXISTS "articulo_web" RENAME COLUMN "articulo_id_origen" TO "articulo_origen_id";
ALTER TABLE IF EXISTS "articulo_web" RENAME COLUMN "codigo" TO "articulo_cod";
ALTER TABLE IF EXISTS "articulo_web" RENAME COLUMN "descripcion_publica" TO "articulo_texto_web";
ALTER TABLE IF EXISTS "articulo_web" RENAME COLUMN "precio_publicado" TO "precio_mayorista";

ALTER TABLE IF EXISTS "articulo_web"
  ALTER COLUMN "articulo_cod" TYPE VARCHAR(20) USING LEFT(COALESCE("articulo_cod", ''), 20),
  ALTER COLUMN "articulo_cod" SET NOT NULL,
  ALTER COLUMN "articulo_texto_web" TYPE TEXT,
  ALTER COLUMN "destacado" TYPE CHAR(1) USING CASE WHEN "destacado" THEN 'S' ELSE 'N' END,
  ALTER COLUMN "destacado" SET DEFAULT 'N';

ALTER TABLE IF EXISTS "articulo_web"
  ADD COLUMN IF NOT EXISTS "articulo_des" VARCHAR(30),
  ADD COLUMN IF NOT EXISTS "articulo_imagen_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "precio_minorista" NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS "proveedor_des" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "stock_web" INTEGER,
  ADD COLUMN IF NOT EXISTS "visible" CHAR(1) NOT NULL DEFAULT 'S';

ALTER TABLE IF EXISTS "articulo_web"
  DROP COLUMN IF EXISTS "imagen_url";

UPDATE "articulo_web"
SET
  "articulo_des" = LEFT(COALESCE("articulo_texto_web", ''), 30),
  "precio_minorista" = COALESCE("precio_minorista", "precio_mayorista");

UPDATE "articulo_web" a
SET "articulo_imagen_id" = img.id
FROM (
  SELECT DISTINCT ON ("articulo_id") "articulo_id", "id"
  FROM "articulo_imagen_web"
  ORDER BY "articulo_id", "orden", "id"
) img
WHERE img."articulo_id" = a."id"
  AND a."articulo_imagen_id" IS NULL;

ALTER INDEX IF EXISTS "articulo_codigo_key" RENAME TO "articulo_web_articulo_cod_key";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articulo_web_articulo_imagen_id_fkey'
  ) THEN
    ALTER TABLE "articulo_web"
      ADD CONSTRAINT "articulo_web_articulo_imagen_id_fkey"
      FOREIGN KEY ("articulo_imagen_id")
      REFERENCES "articulo_imagen_web"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;

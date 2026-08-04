BEGIN;

ALTER TABLE "pedido_detalle_web"
  ADD COLUMN IF NOT EXISTS "articulo_cod" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "articulo_des" VARCHAR(30);

UPDATE "pedido_detalle_web" AS detalle
SET
  "articulo_cod" = articulo."articulo_cod",
  "articulo_des" = articulo."articulo_des"
FROM "articulo_web" AS articulo
WHERE articulo."id" = detalle."articulo_id"
  AND (
    detalle."articulo_cod" IS NULL
    OR detalle."articulo_des" IS NULL
  );

COMMIT;

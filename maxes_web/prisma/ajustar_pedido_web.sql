BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pedido_web'
      AND column_name = 'total'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pedido_web'
      AND column_name = 'monto_total'
  ) THEN
    EXECUTE 'ALTER TABLE "pedido_web" RENAME COLUMN "total" TO "monto_total"';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pedido_web'
      AND column_name = 'cliente_nombre'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'pedido_web'
      AND column_name = 'nombre'
  ) THEN
    EXECUTE 'ALTER TABLE "pedido_web" RENAME COLUMN "cliente_nombre" TO "nombre"';
  END IF;
END $$;

ALTER TABLE IF EXISTS "pedido_web"
  ALTER COLUMN "fecha" TYPE TIMESTAMPTZ USING "fecha"::timestamptz,
  ALTER COLUMN "fecha" DROP NOT NULL,
  ALTER COLUMN "doc_tipo" DROP NOT NULL,
  ALTER COLUMN "doc_numero" DROP NOT NULL,
  ALTER COLUMN "cuit" DROP NOT NULL,
  ALTER COLUMN "estado" DROP NOT NULL;

ALTER TABLE IF EXISTS "pedido_web"
  ADD COLUMN IF NOT EXISTS "cliente_nro" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "nombre" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "apellido" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "email_pedido" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "celular_pedido" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "cant_productos" INTEGER,
  ADD COLUMN IF NOT EXISTS "cant_unidades" INTEGER,
  ADD COLUMN IF NOT EXISTS "tipo_compra" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "monto_total" NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS "tipo_despacho" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "localidad" VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "observaciones" TEXT;

ALTER TABLE IF EXISTS "pedido_web"
  ALTER COLUMN "nombre" TYPE VARCHAR(100) USING LEFT(COALESCE("nombre", ''), 100),
  ALTER COLUMN "nombre" DROP NOT NULL,
  ALTER COLUMN "apellido" DROP NOT NULL,
  ALTER COLUMN "monto_total" TYPE NUMERIC(18,2) USING "monto_total"::numeric,
  ALTER COLUMN "monto_total" DROP NOT NULL;

ALTER TABLE IF EXISTS "pedido_web"
  DROP COLUMN IF EXISTS "email",
  DROP COLUMN IF EXISTS "celular",
  DROP COLUMN IF EXISTS "retira",
  DROP COLUMN IF EXISTS "email_enviado";

COMMIT;

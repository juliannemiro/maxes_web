-- Réplica pública de detalles de categoría. No elimina ni reemplaza registros.
CREATE TABLE IF NOT EXISTS categoria_detalle_web (
  id serial PRIMARY KEY,
  categoria_detalle_origen_id integer NOT NULL UNIQUE,
  categoria_origen_id integer NOT NULL,
  codigo varchar(20) NOT NULL,
  nombre varchar(100),
  activo boolean NOT NULL DEFAULT true,
  CONSTRAINT categoria_detalle_web_categoria_fk
    FOREIGN KEY (categoria_origen_id)
    REFERENCES categoria_web(categoria_origen_id)
    ON DELETE RESTRICT,
  CONSTRAINT categoria_detalle_web_categoria_codigo_key
    UNIQUE (categoria_origen_id, codigo)
);

ALTER TABLE articulo_web
  ADD COLUMN IF NOT EXISTS categoria_detalle_id integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'articulo_web_categoria_detalle_fk'
  ) THEN
    ALTER TABLE articulo_web
      ADD CONSTRAINT articulo_web_categoria_detalle_fk
      FOREIGN KEY (categoria_detalle_id)
      REFERENCES categoria_detalle_web(categoria_detalle_origen_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS articulo_web_categoria_detalle_idx
  ON articulo_web(categoria_detalle_id);

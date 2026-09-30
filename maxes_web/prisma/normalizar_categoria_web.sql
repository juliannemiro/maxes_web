-- Asegura la proyección de categorías utilizada por el catálogo publicado.
-- No elimina ni reemplaza registros existentes.

CREATE TABLE IF NOT EXISTS categoria_web (
  id serial PRIMARY KEY,
  categoria_origen_id integer NULL,
  codigo varchar(20) NOT NULL,
  nombre varchar(100),
  activo boolean NOT NULL DEFAULT true
);

ALTER TABLE categoria_web
  ADD COLUMN IF NOT EXISTS categoria_origen_id integer NULL;

UPDATE categoria_web
SET categoria_origen_id = id
WHERE categoria_origen_id IS NULL;

ALTER TABLE categoria_web
  ALTER COLUMN categoria_origen_id SET NOT NULL;

-- Índice completo: además de unicidad, puede ser objetivo de claves foráneas.
CREATE UNIQUE INDEX IF NOT EXISTS categoria_web_origen_unique_full
  ON categoria_web(categoria_origen_id);

ALTER TABLE articulo_web ADD COLUMN IF NOT EXISTS categoria_id integer NULL;

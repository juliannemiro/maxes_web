ALTER TABLE carrusel_home_web ADD COLUMN IF NOT EXISTS carrusel_origen_id integer NULL;
UPDATE carrusel_home_web SET carrusel_origen_id=id WHERE carrusel_origen_id IS NULL;
ALTER TABLE carrusel_home_web ALTER COLUMN carrusel_origen_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS carrusel_home_web_origen_key ON carrusel_home_web(carrusel_origen_id);

BEGIN;

ALTER TABLE integracion_novedad_detalle
    ADD COLUMN IF NOT EXISTS campo_label VARCHAR(150);

UPDATE integracion_novedad_detalle
SET campo_label = CASE campo
    WHEN 'art' THEN 'Código de artículo'
    WHEN 'dArt' THEN 'Descripción'
    WHEN 'textoWeb' THEN 'Texto web'
    WHEN 'costo' THEN 'Costo'
    WHEN 'precioMayorista' THEN 'Precio mayorista'
    WHEN 'precioMinorista' THEN 'Precio minorista'
    WHEN 'categoriaId' THEN 'Categoria'
    WHEN 'marcaDes' THEN 'Marca'
    WHEN 'stockWeb' THEN 'Stock web'
    WHEN 'destacado' THEN 'Destacado'
    WHEN 'publicado' THEN 'Publicado'
    WHEN 'fechaPublicacion' THEN 'Fecha de publicación'
    ELSE campo
END
WHERE campo_label IS NULL OR campo_label = '' OR campo_label = campo;

ALTER TABLE integracion_novedad_detalle
    ALTER COLUMN campo_label SET NOT NULL;

COMMENT ON COLUMN integracion_novedad_detalle.campo_label IS
    'Etiqueta amigable definida por el sistema origen para mostrar el campo al usuario.';

COMMIT;

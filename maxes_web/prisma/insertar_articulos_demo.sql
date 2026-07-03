BEGIN;

WITH nuevos_articulos AS (
  INSERT INTO articulo_web (
    articulo_origen_id,
    articulo_cod,
    articulo_des,
    articulo_texto_web,
    precio_mayorista,
    precio_minorista,
    rubro_id,
    proveedor_des,
    stock_web,
    destacado,
    visible,
    fecha_publicacion
  )
  VALUES
    (
      1,
      'Noga-nkb100',
      LEFT('Teclado + Mouse Con Cable NKB-100 Noga', 30),
      LEFT('Computacion (NOVEDADES)', 50),
      9941.00,
      11929.20,
      (SELECT id FROM rubro_web WHERE nombre = 'Computacion' LIMIT 1),
      LEFT('Fabi Noga', 20),
      12,
      'N',
      'S',
      NOW()
    ),
    (
      2,
      '0002-es',
      LEFT('Cable Tipo C Motorola 1 Mt', 30),
      LEFT('Cable Tipo C (NOVEDADES)', 50),
      1068.00,
      1281.60,
      (SELECT id FROM rubro_web WHERE nombre = 'Cable Tipo C' LIMIT 1),
      LEFT('Esteban', 20),
      20,
      'N',
      'S',
      NOW()
    ),
    (
      3,
      'Lambo-161',
      LEFT('Soporte Magnetico Sopapa 25100 Lambo Tech', 30),
      LEFT('Soporte (NOVEDADES)', 50),
      5353.00,
      6423.60,
      (SELECT id FROM rubro_web WHERE nombre = 'Soporte' LIMIT 1),
      LEFT('Lambo Tech', 20),
      30,
      'N',
      'S',
      NOW()
    ),
    (
      4,
      'Ditr-Skp2',
      LEFT('Cartel Luminoso Led Pizarra Usb Ditron', 30),
      LEFT('CARTEL LUMINOSO LED Cartel Luminoso Lightbox para crear y personalizar mensajes. Es ideal para decorar todo tipo de espacios, vidrieras o colocar en eventos, como bodas y cumpleaños. Incluye piezas entre consonantes, vocales y varios tipos de símbolos. Es de muy bajo consumo y funciona con cable USB o pilas AA (no incluidas). ESPECIFICACIONES • Alimentación: Cable USB o Pilas AA (no incluidas) • Color de Luz: Blanco • Luminosidad: 600 Lm • Voltaje: 5V • Potencia: 2W • Tamaño: 29,5x 21,7x 4,5 • Tamaño letras: 6,5 x3,5 • Material: ABS La caja incluye: - Cartel Luminoso LED Lightbox - Cable USB - INCLUYE 3 LAMINAS DE PLASTICO (LETRAS, SIMBOLOS, NUMEROS y EMOJIS)... 1.- ABECEDARIO COMPLETO CON DOS UNIDADES DE CADA LETRA (No incluye letra Ñ), NUMEROS, SIMBOLOS VARIOS 2.- ABECEDARIO COMPLETO DE COLORES (5 colores aleatorios, no incluye letra Ñ) NUMEROS. 3.- 85 EMOJIS DISTINTOS A COLORES', 50),
      9091.00,
      10909.20,
      (SELECT id FROM rubro_web WHERE nombre = 'Varios' LIMIT 1),
      LEFT('Ditron', 20),
      36,
      'N',
      'S',
      NOW()
    )
  ON CONFLICT (articulo_cod) DO UPDATE
  SET
    articulo_des = EXCLUDED.articulo_des,
    articulo_texto_web = EXCLUDED.articulo_texto_web,
    precio_mayorista = EXCLUDED.precio_mayorista,
    precio_minorista = EXCLUDED.precio_minorista,
    rubro_id = EXCLUDED.rubro_id,
    proveedor_des = EXCLUDED.proveedor_des,
    stock_web = EXCLUDED.stock_web,
    destacado = EXCLUDED.destacado,
    visible = EXCLUDED.visible
  RETURNING id, articulo_cod
),
imagenes_borradas AS (
  DELETE FROM articulo_imagen_web
  WHERE articulo_id IN (SELECT id FROM nuevos_articulos)
  RETURNING articulo_id
),
imagenes_insertadas AS (
  INSERT INTO articulo_imagen_web (articulo_id, imagen_url, orden)
  VALUES
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = 'Noga-nkb100'), 'https://www.maxesinsumos.com/fotos/Noga-nkb100.jpg', 1),
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = 'Noga-nkb100'), 'https://www.maxesinsumos.com/fotos/Noga-nkb100-2.jpg', 2),
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = '0002-es'), 'https://www.maxesinsumos.com/fotos/0057-Pw.jpg', 1),
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = '0002-es'), 'https://www.maxesinsumos.com/fotos/0057-Pw-2.jpg', 2),
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = 'Lambo-161'), 'https://www.maxesinsumos.com/fotos/Mobi-0067.jpg', 1),
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = 'Ditr-Skp2'), 'https://www.maxesinsumos.com/fotos/Ditr-Skp2.jpg', 1),
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = 'Ditr-Skp2'), 'https://www.maxesinsumos.com/fotos/Ditr-Skp2-2.jpg', 2),
    ((SELECT id FROM nuevos_articulos WHERE articulo_cod = 'Ditr-Skp2'), 'https://www.maxesinsumos.com/fotos/Ditr-Skp2-3.jpg', 3)
  RETURNING id, articulo_id, orden
)
UPDATE articulo_web a
SET articulo_imagen_id = img.id
FROM (
  SELECT DISTINCT ON (articulo_id) articulo_id, id
  FROM imagenes_insertadas
  ORDER BY articulo_id, orden
) img
WHERE a.id = img.articulo_id;

COMMIT;

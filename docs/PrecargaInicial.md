# Precarga inicial desde Excel

Los archivos `clientes.xls` y `productos.xls` están exportados como HTML, por lo que se pueden transformar sin librerías externas.

## Estado del esquema actual

- El modelo Prisma `Articulo` usa la tabla fisica `articulo_web`.
- El modelo Prisma `Rubro` usa la tabla fisica `rubro_web`.
- No existe `cliente_web` ni `cliente` en el esquema Prisma actual.
- Los datos del comprador hoy se guardan únicamente dentro de `pedido_web`.

## Mapeo de productos

Columnas con destino directo:

- `CODIGO` -> `articulo.codigo`
- `DETALLE` -> `articulo.descripcion_publica`
- `Precio #1` -> `articulo.precio_mayorista`
- `Precio #2` -> `articulo.precio_minorista`
- `Rubro` -> `rubro.nombre` y relación `articulo.rubro_id`

Columnas sin destino directo en el esquema actual:

- `QxB`
- `Costo`
- `Precio #3`
- `Precio #4`
- `Precio #5`
- `Stock Deposito 1`
- `Despacho`
- `Pto Pedido`
- `Proveedor`

## Mapeo de clientes

No hay tabla destino directa para precargar clientes. El dato más cercano en el esquema actual es:

- `DETALLE` -> `pedido.cliente_nombre`
- `C.U.I.T. No` -> `pedido.cuit`

El resto de columnas de `clientes.xls` requiere crear una entidad nueva (`cliente` o `cliente_web`) si se quiere conservarlas de forma estructurada.

## Script incluido

Se agregó `maxes_web/scripts/generar-precarga-inicial.mjs`.

Para avanzar solo con artículos, también se agregó `maxes_web/scripts/importar-articulos-desde-xls.mjs`.
Para cargar únicamente los rubros distintos del Excel, se agregó `maxes_web/scripts/importar-rubros-desde-xls.mjs`.
Para cargar artículos de prueba desde JSON con imágenes, se agregó `maxes_web/scripts/importar-articulos-json.mjs`.

Ejemplo:

```bash
cd maxes_web
node ./scripts/generar-precarga-inicial.mjs \
  --clientes /home/jnemiro/Descargas/clientes.xls \
  --productos /home/jnemiro/Descargas/productos.xls
```

Salida generada en `maxes_web/prisma/seed-data/`:

- `rubros.json`
- `articulos.json`
- `catalogo-sync.json`
- `clientes-sin-tabla.json`
- `resumen-precarga.json`

## Importación directa a base

Solo rubros (modelo Prisma `Rubro`, tabla fisica `rubro_web`):

```bash
cd maxes_web
node ./scripts/importar-rubros-desde-xls.mjs \
  --productos /home/jnemiro/Descargas/productos.xls
```

Ese script toma el `distinct` lógico de la columna `Rubro` y hace `upsert` por `codigo`.

Si querés cargar artículos y rubros (modelos Prisma `Articulo` y `Rubro`, tablas fisicas `articulo_web` y `rubro_web`):

```bash
cd maxes_web
node ./scripts/importar-articulos-desde-xls.mjs \
  --productos /home/jnemiro/Descargas/productos.xls
```

Ese script:

- crea o actualiza `rubro_web` por `codigo`
- crea o actualiza `articulo_web` por `articulo_cod`
- usa `Precio #1` como `precio_mayorista`
- usa `Precio #2` como `precio_minorista`

## Importación desde JSON con imágenes

Si tenés un array JSON con esta forma:

```json
{
  "articulo_cod": "RS-M4",
  "articulo_des": "Radio Retro FM Celeste Recargable",
  "precio_mayorista": 13882,
  "precio_minorista": 16658,
  "stock_web": 37,
  "proveedor": "RoyalCell",
  "rubro": "Radio",
  "articulo_texto_web": "Radio retro portátil FM recargable con diseño clásico.",
  "imagen 1": "https://www.maxesinsumos.com/images/productos/radio_rs_m4_celeste_1.jpg",
  "imagen 2": "https://www.maxesinsumos.com/images/productos/radio_rs_m4_celeste_2.jpg"
}
```

podés importarlo así:

```bash
cd maxes_web
npm run seed:importar-articulos-json -- --input /ruta/articulos.json
```

Ese script:

- crea o actualiza `rubro` a partir de `rubro`
- crea o actualiza `articulo` por `articulo_cod`
- toma `articulo_texto_web` como descripción pública/detallada
- inserta `imagen 1`, `imagen 2`, `imagen 3`, `imagen 4` en `articulo_imagen_web`
- deja `imagen 1` como imagen principal del artículo

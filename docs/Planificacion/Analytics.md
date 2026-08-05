# Analytics de Maxes Web

## Objetivo

Este documento define las condiciones funcionales de las primeras mediciones de
Maxes Web:

1. Dispositivo utilizado.
2. Carritos abandonados.
3. Uso de comentarios en los artículos.
4. Tiempo transcurrido hasta generar un pedido.
5. Uso y aporte comercial de favoritos.
6. Artículos compartidos desde el catálogo.

La implementación debe permitir medir el abandono aunque el visitante cierre el
navegador y nunca vuelva al sitio.

## Ubicación de los datos en el ecosistema

La escritura y consulta siguen la arquitectura general de Maxes:

1. `maxes_web` escribe analytics en PostgreSQL local durante desarrollo y en
   Supabase durante producción.
2. `maxes_web` no se conecta a SQL Server.
3. En la misma ejecución que descarga pedidos, el backend de
   `maxes_admin_web` descarga también analytics.
4. `maxes_admin_web` inserta o actualiza las tablas espejo en SQL Server.
5. Las vistas administrativas de resultados consultan SQL Server mediante el
   backend de `maxes_admin_web`.

Supabase es la fuente de verdad de la actividad web. SQL Server conserva la
réplica utilizada para informes internos.

Las tablas espejo de SQL Server se crean con
`maxes_admin_web/sqlserver/008_crear_tablas_analytics.sql`.

### Convención de nombres

Todas las tablas comienzan con `analytics_` para que queden agrupadas:

```text
analytics_carrito
analytics_carrito_detalle
analytics_favorito_evento
analytics_articulo_compartido
```

Los nombres anteriores quedan obsoletos:

```text
carrito_analytics
carrito_analytics_detalle
favorito_analytics_evento
```

Los scripts de PostgreSQL y SQL Server detectan los nombres anteriores y los
renombran sin borrar información.

## Conceptos generales

### Sesión de analytics

Cada navegador recibe un identificador aleatorio llamado
`id_analytics_session`. Este valor no contiene información personal y permite
relacionar las acciones realizadas durante una visita.

La sesión se registra en el servidor cuando el catálogo termina su primera carga
correctamente. No debe esperarse a que el visitante agregue un artículo.

El identificador se conserva en el almacenamiento local del navegador para que
un carrito pueda continuar después de cerrar y volver a abrir el sitio.

No se considera una identificación absoluta de la persona. Se creará una sesión
diferente si el visitante:

- borra los datos del navegador;
- utiliza navegación privada;
- cambia de navegador;
- cambia de dispositivo.

### Carrito de analytics

El carrito del navegador debe tener también una representación en el servidor.
El frontend sincroniza el carrito con el servidor cuando ocurre una acción
significativa.

El cálculo de abandono se realiza con los datos guardados en el servidor. No
depende de que el visitante vuelva a abrir Maxes Web.

### Acción significativa

Se considera actividad del carrito cuando ocurre alguna de estas acciones:

- se agrega un artículo;
- se modifica la cantidad de un artículo;
- se elimina un artículo;
- se agrega, modifica o elimina un comentario;
- se abre el carrito;
- se ingresa a la página del pedido;
- se intenta generar el pedido.

Los movimientos del mouse, el desplazamiento de la página y la permanencia en
una pestaña no actualizan la actividad del carrito.

La sincronización de las acciones que cambian el contenido del carrito debe
enviarse inmediatamente. No debe esperar a que el navegador se cierre ni
depender de un evento de salida de la página.

## Estados y etapas del carrito

### Estado actual

El campo `estado` admite:

| Estado | Condición |
| --- | --- |
| `activo` | El carrito contiene al menos un artículo, no generó un pedido y tuvo actividad hace menos de 12 horas. |
| `abandonado` | El carrito contiene al menos un artículo, no generó un pedido y transcurrieron 12 horas o más desde su última actividad. |
| `pedido_generado` | El servidor creó correctamente un registro en `pedido_web` a partir del carrito. |

`pedido_generado` no significa que el pedido esté pagado, aprobado o facturado.
Sólo indica que fue registrado correctamente en Maxes Web.

Un carrito vacío no se considera abandonado. Si se eliminan todos sus artículos,
puede conservarse para auditoría, pero queda fuera del indicador de abandono.

### Etapa alcanzada

El campo `etapa` permite diferenciar:

| Etapa | Condición |
| --- | --- |
| `carrito` | El visitante agregó artículos, pero nunca ingresó a `/pedido`. |
| `formulario_pedido` | El visitante ingresó a `/pedido`, pero todavía no generó el pedido. |
| `pedido_generado` | El pedido fue creado correctamente. |

La etapa sólo avanza. Volver desde `/pedido` al catálogo no cambia
`formulario_pedido` a `carrito`.

### Marcación automática de abandono

Un proceso del servidor debe buscar periódicamente carritos que cumplan todas
estas condiciones:

```text
estado = activo
cantidad_productos > 0
pedido_id es nulo
fecha_hora_ultima_actividad <= fecha/hora actual - 12 horas
```

Para esos registros debe:

```text
estado = abandonado
fue_abandonado = verdadero
fecha_hora_marcado_abandonado = fecha/hora actual
```

La regla se basa siempre en el límite exacto de 12 horas. La actualización
material puede suceder unos minutos después, según la frecuencia con la que se
ejecute el proceso.

La función PostgreSQL `analytics_marcar_carritos_abandonados()` es ejecutada por
`maxes_admin_web` al comienzo de cada sincronización periódica, antes de leer
pedidos y analytics. Esto aplica la misma regla en PostgreSQL Docker y en
Supabase sin depender de visitas al sitio.

La programación opcional de Supabase Cron se conserva como alternativa de
respaldo, pero no es obligatoria mientras el sincronizador administrativo esté
funcionando cada 15 minutos.

### Regreso posterior

Si el visitante vuelve después de las 12 horas y modifica el mismo carrito:

```text
estado: abandonado -> activo
cantidad_reactivaciones: +1
fecha_hora_ultima_reactivacion: fecha/hora actual
fecha_hora_ultima_actividad: fecha/hora actual
```

`fue_abandonado` continúa en verdadero y
`fecha_hora_marcado_abandonado` no se elimina.

Si posteriormente genera el pedido:

```text
estado: activo o abandonado -> pedido_generado
etapa: pedido_generado
pedido_id: identificador de pedido_web
fecha_hora_pedido_generado: fecha/hora actual
```

De esta forma, el estado muestra el resultado actual y `fue_abandonado` conserva
que el carrito estuvo abandonado previamente.

## Fechas y horas

Todas las fechas se guardan como fecha y hora con zona horaria.

| Campo | Uso |
| --- | --- |
| `fecha_hora_creacion` | Momento en que se crea el carrito en el servidor. |
| `fecha_hora_inicio_catalogo` | Primera carga correcta del catálogo asociada a la sesión. No se sobrescribe. |
| `fecha_hora_ultima_actividad` | Última acción significativa. Es la base para calcular las 12 horas. |
| `fecha_hora_inicio_pedido` | Primera entrada a `/pedido`. No se sobrescribe en entradas posteriores. |
| `fecha_hora_marcado_abandonado` | Primera vez que el servidor determina el abandono. |
| `fecha_hora_ultima_reactivacion` | Último regreso posterior a un abandono. |
| `fecha_hora_pedido_generado` | Momento en que el servidor crea `pedido_web`. |

## Tiempo hasta generar el pedido

Esta medición se realiza únicamente sobre carritos cuyo estado sea
`pedido_generado`.

### Tiempo total hasta el pedido

Mide el tiempo calendario completo desde la primera carga correcta del catálogo
hasta que el servidor crea el pedido:

```text
fecha_hora_pedido_generado - fecha_hora_inicio_catalogo
```

Si el visitante comienza el carrito, se va durante ocho horas y después vuelve
para generar el pedido, esas ocho horas forman parte del tiempo total.

Este indicador responde cuánto demoró el proceso comercial completo, pero no
debe presentarse como tiempo de navegación activa.

### Tiempo activo de navegación

Mide el tiempo aproximado durante el cual el visitante estuvo utilizando Maxes
Web. Debe acumularse sólo mientras:

- la pestaña de Maxes Web está visible; y
- existe interacción reciente del visitante.

Una ventana activa finaliza cuando ocurre primero alguno de estos casos:

- la pestaña se oculta o se cierra;
- transcurren 30 minutos sin una acción del visitante;
- se genera correctamente el pedido.

Una nueva interacción posterior inicia otra ventana activa. El frontend envía
periódicamente al servidor el tiempo acumulado; no debe depender exclusivamente
del cierre de la pestaña.

El campo acumulado se denomina `segundos_navegacion_activa`.

Esta medición es aproximada: si el último envío no alcanza al servidor por un
cierre abrupto o pérdida de conexión, pueden perderse los últimos segundos de la
ventana.

### Tiempo dentro del formulario

Mide el tiempo desde la primera entrada a `/pedido` hasta la creación correcta
del pedido:

```text
fecha_hora_pedido_generado - fecha_hora_inicio_pedido
```

Permite detectar si el formulario está demorando o dificultando la finalización.

### Indicadores

Para pedidos generados deben mostrarse:

- mediana del tiempo total hasta el pedido;
- mediana del tiempo activo de navegación;
- mediana del tiempo dentro del formulario;
- percentil 75 de cada tiempo;
- distribución por tipo de dispositivo;
- distribución por tipo de precio;
- cantidad de pedidos generados después de un abandono.

La mediana es el indicador principal porque unos pocos visitantes que regresan
muchas horas o días después pueden distorsionar fuertemente el promedio.

También pueden utilizarse rangos:

```text
menos de 5 minutos
de 5 a 15 minutos
de 15 a 30 minutos
de 30 minutos a 2 horas
de 2 a 12 horas
más de 12 horas
```

## Medición de carritos abandonados

### Carritos con contenido

Cantidad de carritos que tuvieron al menos un artículo durante el período.

### Carritos abandonados

Cantidad de carritos cuyo campo `fue_abandonado` sea verdadero.

Este indicador conserva los carritos que luego fueron reactivados o terminaron
en un pedido.

### Carritos actualmente abandonados

Cantidad de carritos cuyo `estado` actual sea `abandonado`.

### Tasa de abandono inicial

```text
carritos con fue_abandonado = verdadero
----------------------------------------- × 100
carritos con contenido
```

### Tasa de abandono definitivo

```text
carritos con estado = abandonado
--------------------------------- × 100
carritos con contenido
```

### Carritos recuperados

Cantidad de carritos que cumplen:

```text
fue_abandonado = verdadero
estado = pedido_generado
```

### Abandono por etapa

- Abandono en carrito: `estado = abandonado` y `etapa = carrito`.
- Abandono en formulario: `estado = abandonado` y
  `etapa = formulario_pedido`.

### Monto abandonado

Suma de `monto_estimado` de los carritos cuyo estado actual sea `abandonado`.
El monto utiliza los precios vigentes en la última sincronización del carrito.

## Medición de dispositivos

Los datos del dispositivo se determinan al crear la sesión:

| Campo | Valores esperados |
| --- | --- |
| `tipo_dispositivo` | `celular`, `tablet`, `computadora`, `desconocido` |
| `sistema_operativo` | `Android`, `iOS`, `Windows`, `macOS`, `Linux`, `otro` |
| `navegador` | `Chrome`, `Safari`, `Edge`, `Firefox`, `otro` |

Los indicadores principales son:

- sesiones por tipo de dispositivo;
- carritos con contenido por tipo de dispositivo;
- carritos abandonados por tipo de dispositivo;
- pedidos generados por tipo de dispositivo;
- tasa de pedido generado por tipo de dispositivo.

La tasa de pedido generado se calcula así:

```text
carritos con estado = pedido_generado
-------------------------------------- × 100
carritos con contenido
```

El dato corresponde al dispositivo donde se creó el carrito. Un carrito no
puede relacionarse automáticamente entre distintos dispositivos sin identificar
al cliente.

## Medición del uso de comentarios

### Definición de incorporación

Una incorporación ocurre cuando un artículo que no estaba presente pasa a
formar parte del carrito.

- Cambiar la cantidad no crea una incorporación nueva.
- Eliminar el artículo y agregarlo nuevamente crea una incorporación nueva.
- Agregar diez unidades en una acción cuenta como una incorporación y diez
  unidades.

Se debe conservar el historial de incorporaciones aunque posteriormente el
artículo sea eliminado.

### Comentario en carrito

Una incorporación se considera `con comentario` cuando tuvo un comentario no
vacío en algún momento mientras permaneció en el carrito.

Si el comentario se agrega después de incorporar el artículo, el indicador de
esa incorporación cambia a verdadero. Si luego se borra el texto, debe
conservarse que el campo fue utilizado mediante `tuvo_comentario = verdadero`.

No es necesario almacenar el texto del comentario en analytics.

### Uso de comentarios sobre artículos agregados

La métrica principal se calcula por incorporaciones, no por unidades:

```text
incorporaciones con tuvo_comentario = verdadero
------------------------------------------------ × 100
total de incorporaciones
```

Debe mostrarse:

- total general;
- porcentaje por artículo;
- porcentaje por rubro;
- porcentaje por tipo de precio;
- porcentaje por dispositivo.

### Uso de comentarios sobre artículos pedidos

Se calcula usando las líneas efectivamente guardadas en
`pedido_detalle_web`:

```text
líneas de pedido con comentario no vacío
----------------------------------------- × 100
total de líneas de pedido
```

Una línea con cien unidades y un comentario cuenta como una línea comentada, no
como cien comentarios.

Debe mostrarse:

- total general;
- porcentaje por artículo;
- porcentaje por rubro;
- porcentaje por tipo de precio;
- cantidad de pedidos con al menos un comentario.

### Métrica secundaria por unidades

Como información complementaria puede calcularse:

```text
unidades pertenecientes a líneas con comentario
------------------------------------------------ × 100
total de unidades
```

Esta métrica no reemplaza el indicador principal por líneas.

## Medición de favoritos

El objetivo es determinar si favoritos ayuda a generar pedidos o si solamente
acumula artículos que no vuelven a utilizarse.

### Acciones registradas

| Acción | Condición |
| --- | --- |
| `agregado` | El visitante marca el corazón de un artículo que no era favorito. |
| `quitado` | El visitante desmarca el corazón de un artículo favorito. |
| `estado_actual` | Se sincroniza la cantidad actual después de cargar o modificar favoritos. |
| `panel_visto` | El visitante abre la página `/favoritos`. |
| `panel_pedido_abierto` | El visitante despliega la sección de favoritos dentro de `/pedido`. |

Cada evento conserva:

- sesión;
- artículo, cuando corresponde;
- origen de la acción;
- cantidad total de favoritos después de la acción;
- fecha y hora.

Marcar repetidamente el mismo artículo no debe generar varios eventos
`agregado`. Cada cambio real de estado genera un solo evento.

### Origen de una incorporación al carrito

Cada incorporación al carrito guarda `origen_incorporacion` con uno de estos
valores:

| Origen | Condición |
| --- | --- |
| `catalogo` | Se agrega desde el catálogo o el detalle del producto. |
| `panel_favoritos` | Se agrega desde la página `/favoritos`. |
| `favoritos_en_pedido` | Se agrega desde la sección de favoritos mostrada dentro de `/pedido`. |

También se guarda `era_favorito_al_agregar`, independientemente de la pantalla
desde la que se realizó la incorporación.

Esto permite diferenciar:

- artículos agregados directamente desde un panel de favoritos;
- artículos que eran favoritos pero se agregaron desde el catálogo;
- artículos sin relación con favoritos.

### Indicadores principales

- sesiones con al menos un favorito;
- cantidad de favoritos agregados y quitados;
- cantidad actual de favoritos por sesión;
- promedio y mediana de favoritos por sesión;
- artículos marcados como favoritos con mayor frecuencia;
- porcentaje de sesiones que visitan el panel de favoritos;
- porcentaje de sesiones que abren favoritos dentro del pedido;
- incorporaciones al carrito desde `/favoritos`;
- incorporaciones al carrito desde favoritos dentro de `/pedido`;
- líneas finalmente pedidas cuyo origen fue `panel_favoritos`;
- líneas finalmente pedidas cuyo origen fue `favoritos_en_pedido`;
- porcentaje de favoritos que posteriormente se incorporan a un carrito;
- porcentaje de incorporaciones originadas en favoritos que terminan en un
  pedido;
- tiempo entre marcar un artículo como favorito y agregarlo al carrito;
- tasa de eliminación de favoritos;
- favoritos nunca utilizados en un carrito.

### Fórmulas principales

Uso de favoritos para agregar artículos:

```text
incorporaciones con era_favorito_al_agregar = verdadero
-------------------------------------------------------- × 100
total de incorporaciones al carrito
```

Aporte directo de los paneles de favoritos:

```text
incorporaciones con origen panel_favoritos o favoritos_en_pedido
----------------------------------------------------------------- × 100
total de incorporaciones al carrito
```

Pedido generado desde favoritos:

```text
líneas incorporadas desde favoritos que terminaron en pedido
------------------------------------------------------------- × 100
líneas incorporadas desde favoritos
```

Para atribuir una línea pedida a favoritos se utiliza la incorporación activa
del artículo al momento de generar el pedido. Una modificación de cantidad no
cambia su origen.

## Medición de artículos compartidos

El objetivo es conocer qué productos generan interés suficiente para que un
visitante los envíe o copie su enlace. La métrica funcional se denomina
`articulos_compartidos`.

Se registra un evento después de que el visitante completa una de estas
acciones desde el detalle del producto:

| Método | Condición |
| --- | --- |
| `whatsapp` | El visitante abre WhatsApp o WhatsApp Web desde el menú de compartir. |
| `copiar_link` | El enlace se copia correctamente al portapapeles. |

Un error al copiar no genera un evento. Para WhatsApp se cuenta la apertura del
enlace universal `wa.me`; la web no puede confirmar el envío final. La
métrica cuenta acciones iniciadas, no aperturas posteriores del
enlace ni destinatarios alcanzados.

Cada evento conserva la sesión, el artículo, el método y la fecha/hora. No
guarda el destinatario ni el contenido de la conversación.

Los enlaces oficiales usan el código único del producto:

```text
https://maxes-web.vercel.app/articulo/{articulo_cod}
```

`articulo_cod` es único en `articulo_web`. El código se codifica para URL y la
página declara ese enlace como canónico. Una URL canónica indica cuál es la
dirección oficial cuando el mismo catálogo puede mostrarse desde distintas
rutas o filtros; evita tratar esas variantes como páginas diferentes.

Indicadores del panel:

- total de acciones de compartir (`articulos_compartidos`);
- productos distintos compartidos;
- sesiones que compartieron al menos un producto;
- distribución entre `whatsapp` y `copiar_link`;
- ranking de artículos más compartidos por código.

## Campos propuestos

### `analytics_carrito`

```text
id
id_analytics_session
estado
etapa
fue_abandonado
cantidad_reactivaciones
tipo_precio
tipo_dispositivo
sistema_operativo
navegador
cantidad_productos
cantidad_unidades
cantidad_favoritos
monto_estimado
fecha_hora_creacion
fecha_hora_inicio_catalogo
fecha_hora_ultima_actividad
fecha_hora_inicio_pedido
fecha_hora_marcado_abandonado
fecha_hora_ultima_reactivacion
fecha_hora_pedido_generado
segundos_navegacion_activa
pedido_id
origen_campaña
medio_campaña
nombre_campaña
pagina_ingreso
sitio_origen
```

### `analytics_carrito_detalle`

```text
id
carrito_analytics_id
articulo_id
cantidad_inicial
cantidad_ultima
precio_unitario
tuvo_comentario
origen_incorporacion
era_favorito_al_agregar
fecha_hora_agregado
fecha_hora_ultima_modificacion
fecha_hora_eliminado
```

Cada incorporación genera un registro nuevo. Los registros eliminados no se
borran físicamente.

### `analytics_favorito_evento`

```text
id
carrito_analytics_id
articulo_id
accion
origen
cantidad_favoritos
fecha_hora
```

### `analytics_articulo_compartido`

```text
id
carrito_analytics_id
articulo_id
metodo
fecha_hora
```

## Privacidad

No se envían ni guardan en las tablas de analytics:

- nombre o apellido;
- documento o CUIT;
- email;
- teléfono o WhatsApp;
- dirección;
- observaciones del pedido;
- contenido de los comentarios de artículos.

La relación con `pedido_web` se realiza exclusivamente mediante `pedido_id`
después de que el pedido haya sido creado.

## Estado de implementación

Implementado:

- tablas y modelos de PostgreSQL;
- API para iniciar la sesión y sincronizar el carrito;
- sincronización desde `CartContext`;
- registro de entrada a `/pedido`;
- vínculo entre analytics y `pedido_web`;
- función de abandono a las 12 horas;
- acumulación del tiempo activo;
- medición de comentarios y favoritos;
- medición y ranking de artículos compartidos;
- tablas espejo de SQL Server;
- sincronización conjunta de pedidos y analytics;
- idempotencia por ID en la réplica.

Pendiente de operación:

- ejecutar las migraciones en Supabase y SQL Server productivos;
- habilitar y programar Supabase Cron;
- desplegar las versiones nuevas;
- comprobar la sincronización con tráfico productivo.

Pendiente de desarrollo:

- endpoints administrativos de consulta;
- vistas e indicadores en `maxes_admin_web`;
- optimizar la descarga por lotes o marcas de actualización cuando el volumen
  acumulado lo justifique.

## Sincronización con SQL Server

La sincronización de analytics forma parte de `sincronizarPedidosWeb()` y usa
las mismas conexiones y frecuencia que la descarga de pedidos.

Reglas:

- `analytics_carrito`: se actualiza si el ID existe y se inserta si no existe;
- `analytics_carrito_detalle`: se actualiza si el ID existe y se inserta si no
  existe;
- `analytics_favorito_evento`: se inserta únicamente si el ID no existe;
- `analytics_articulo_compartido`: se inserta únicamente si el ID no existe;
- las cuatro operaciones se ejecutan en la misma transacción de SQL Server que
  los pedidos;
- un error revierte la ejecución completa;
- repetir la sincronización no genera duplicados.

## Puesta en marcha por ambiente

### Desarrollo local

1. Iniciar PostgreSQL con `maxes_web/docker-compose.yml`.
2. Ejecutar en PostgreSQL
   `maxes_web/prisma/agregar_analytics_carritos.sql`.
3. Ejecutar en la base SQL Server `e59ges`
   `maxes_admin_web/sqlserver/008_crear_tablas_analytics.sql`.
4. Iniciar `maxes_web`.
5. Iniciar el backend de `maxes_admin_web`.
6. Ejecutar una sincronización manual de pedidos.
7. Verificar las cuatro tablas de SQL Server.

### Producción

El orden obligatorio es:

1. Ejecutar `maxes_web/prisma/agregar_analytics_carritos.sql` en Supabase.
2. Ejecutar `maxes_admin_web/sqlserver/008_crear_tablas_analytics.sql` en
   `e59ges`.
3. Publicar `maxes_web`.
4. Publicar o reiniciar el backend de `maxes_admin_web`.
5. Ejecutar una sincronización manual.
6. Comprobar la réplica antes de habilitar los informes.

Supabase Cron puede habilitarse como respaldo opcional ejecutando
`maxes_web/prisma/programar_abandono_analytics_supabase.sql`.

Las tablas de ambos destinos deben existir antes de iniciar la nueva versión de
`maxes_admin_web`, porque el backend ejecuta una sincronización inicial durante
su arranque.

## Verificación posterior a la instalación

### PostgreSQL / Supabase

```sql
SELECT *
FROM analytics_carrito
ORDER BY id DESC
LIMIT 20;

SELECT *
FROM analytics_carrito_detalle
ORDER BY id DESC
LIMIT 20;

SELECT *
FROM analytics_favorito_evento
ORDER BY id DESC
LIMIT 20;

SELECT *
FROM analytics_articulo_compartido
ORDER BY id DESC
LIMIT 20;
```

Verificación de la tarea de abandono:

```sql
SELECT
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
WHERE jobname = 'maxes-marcar-carritos-abandonados';
```

### SQL Server

```sql
SELECT TOP 20 *
FROM dbo.analytics_carrito
ORDER BY id DESC;

SELECT TOP 20 *
FROM dbo.analytics_carrito_detalle
ORDER BY id DESC;

SELECT TOP 20 *
FROM dbo.analytics_favorito_evento
ORDER BY id DESC;

SELECT TOP 20 *
FROM dbo.analytics_articulo_compartido
ORDER BY id DESC;
```

Verificación de la relación con pedidos:

```sql
SELECT TOP 20
    analytics.id,
    analytics.estado,
    analytics.fue_abandonado,
    analytics.tipo_dispositivo,
    analytics.cantidad_productos,
    analytics.cantidad_favoritos,
    analytics.pedido_id,
    pedido.fecha AS fecha_pedido
FROM dbo.analytics_carrito AS analytics
LEFT JOIN dbo.pedido_web AS pedido
    ON pedido.id = analytics.pedido_id
ORDER BY analytics.id DESC;
```

## Criterios para comenzar las vistas

Antes de desarrollar los informes debe comprobarse:

- que el sitio publicado crea sesiones en `analytics_carrito`;
- que las modificaciones del carrito llegan a
  `analytics_carrito_detalle`;
- que favoritos genera registros en `analytics_favorito_evento`;
- que compartir genera registros en `analytics_articulo_compartido`;
- que un pedido finalizado completa `pedido_id`;
- que Supabase Cron marca abandonos sin una nueva visita;
- que la sincronización administrativa copia los cambios a SQL Server;
- que repetir la sincronización no duplica filas;
- que los conteos informados por el estado de sincronización son coherentes.

Las vistas de `maxes_admin_web` deben consultar exclusivamente las tablas
`dbo.analytics_*` de SQL Server mediante el backend administrativo.

## Panel administrativo

La opción **Analytics** se encuentra al final del menú de `maxes_admin_web`,
después de un separador visual.

Ruta del frontend:

```text
/analytics
```

Endpoint del backend:

```text
GET /api/analytics/resumen?desde=AAAA-MM-DD&hasta=AAAA-MM-DD
```

El endpoint consulta exclusivamente SQL Server y devuelve:

- resumen de sesiones, carritos, formularios y pedidos;
- abandono histórico y actual;
- monto estimado abandonado y ticket promedio;
- carritos recuperados;
- distribución y conversión por dispositivo;
- evolución diaria;
- medianas de tiempo total, navegación activa y formulario;
- uso de comentarios sobre incorporaciones y líneas pedidas;
- productos con mayor uso de comentarios;
- cantidad y acciones de favoritos;
- incorporaciones y pedidos según su origen;
- artículos marcados como favoritos con mayor frecuencia.
- total, método y ranking de artículos compartidos.

### Componentes visuales

El panel presenta:

1. tarjetas de sesiones, conversión, abandono y monto abandonado;
2. embudo desde sesión hasta pedido generado;
3. gráfico de evolución diaria de sesiones y pedidos;
4. distribución circular por dispositivo;
5. tiempos medianos de decisión;
6. comparación del uso de comentarios en carrito y pedido;
7. origen de incorporaciones desde catálogo y favoritos;
8. ranking de artículos comentados, favoritos y compartidos;
9. resumen de métodos utilizados para compartir.

El período puede cambiarse entre 7, 30 y 90 días. También existe una acción de
actualización manual.

Cuando no hay información, los componentes muestran un estado vacío y no
intentan calcular porcentajes dividiendo por cero.

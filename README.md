# Maxes Insumos - Plataforma Web Full

Este repositorio contiene la estructura completa del sitio web público y la API del servidor para **Maxes Insumos**, integrada con el sistema de gestión interno (**Keytron**).

## Estructura de Directorios

```text
maxes_web_full/
├── docker-compose.yml         # Base PostgreSQL local (db-maxes-web)
├── docs/                      # Documentación del proyecto
│   ├── Ejecutar_Proyecto/
│   │   └── Desarrollo_Local.md
│   └── Planificacion/
│       ├── Informe_Arquitectura.md
│       └── tablas.md
│
├── maxes_web/                 # Servidor de API y Base de Datos (Node.js + Prisma)
│   ├── .env                   # Variables base compartidas
│   ├── .env.desarrollo        # Variables para entorno local con Docker
│   ├── .env.produccion        # Variables para produccion con Supabase
│   ├── prisma/
│   │   └── schema.prisma      # Modelos de base de datos PostgreSQL de Prisma
│   ├── src/
│   │   ├── config/            # Cliente de Prisma singleton
│   │   ├── controllers/       # Lógica comercial de integración y pública
│   │   ├── middlewares/       # Seguridad (API Key para Keytron)
│   │   ├── routes/            # Definición de rutas API
│   │   └── index.ts           # Entrada del servidor Express
│   ├── package.json
│   └── tsconfig.json
│
└── maxes_web_cli/             # Cliente Frontend Público (Next.js App Router)
    ├── src/
    │   ├── app/               # Páginas, layout y estilos globales (CSS Premium)
    │   ├── components/        # Componentes UI (Header, Footer, Carrusel, ProductoCard)
    │   ├── context/           # Contexto del Carrito (CartContext con localStorage)
    │   ├── services/          # Cliente de API fetch
    │   └── types/             # Tipado completo TypeScript de la base de datos
    ├── package.json
    └── tsconfig.json
```

---

## Tecnologías Utilizadas

* **Frontend**: Next.js + React + TypeScript + Custom Premium CSS.
* **Backend**: Node.js + Express + TypeScript + Prisma ORM.
* **Base de Datos Local**: PostgreSQL en Docker (`db-maxes-web`).
* **Base de Datos Producción**: PostgreSQL en Supabase.
* **Alojamiento**: Vercel.

## Base de Datos

El proyecto queda planteado con estrategia `local primero`:

* **Local**: contenedor Docker `db-maxes-web`.
* **Producción**: instancia PostgreSQL en Supabase.
* **Variables de entorno backend**: `maxes_web/.env`, `maxes_web/.env.desarrollo` y `maxes_web/.env.produccion`.
* **Variables de entorno frontend**: `maxes_web_cli/.env`, `maxes_web_cli/.env.desarrollo` y `maxes_web_cli/.env.produccion`.
* **Puerto servidor en desarrollo**: `4785`.
* **Puerto cliente en desarrollo**: `3785`.
* **Guía de arranque**: [Desarrollo_Local.md](/home/jnemiro/app_nodejs/maxes_web_full/docs/Ejecutar_Proyecto/Desarrollo_Local.md)
* **Reinicio en desarrollo**: `npm run dev` en backend y frontend libera el puerto si ya esta ocupado y vuelve a iniciar el proceso.

## Documentación

* **Planificación**: [Informe_Arquitectura.md](/home/jnemiro/app_nodejs/maxes_web_full/docs/Planificacion/Informe_Arquitectura.md), [tablas.md](/home/jnemiro/app_nodejs/maxes_web_full/docs/Planificacion/tablas.md)
* **Ejecutar Proyecto**: [Desarrollo_Local.md](/home/jnemiro/app_nodejs/maxes_web_full/docs/Ejecutar_Proyecto/Desarrollo_Local.md)

## Propuesta de Nombres

Cambios ya aplicados en frontend:

| Actual | Nuevo |
| --- | --- |
| `Slider` | `Carrusel` |
| `ProductCard` | `ProductoCard` |

Cambios ya aplicados en backend:

| Actual | Propuesto |
| --- | --- |
| `CatalogController` | `CatalogoController` |
| `OrderController` | `PedidoController` |
| `PublicController` | `PublicoController` |
| `catalogRoutes` | `catalogoRoutes` |
| `orderRoutes` | `pedidoRoutes` |
| `publicRoutes` | `publicRoutes` |

Cambios pendientes de revisión:

| Actual | Propuesto |
| --- | --- |
| `authKeytron` | `autenticarKeytron` |
| `RubroWeb` | `Rubro` |
| `ArticuloWeb` | `Articulo` |
| `PedidoWeb` | `Pedido` |
| `PedidoDetalleWeb` | `PedidoDetalle` |
| `ImagenArticuloWeb` | `ImagenArticulo` |
| `SliderHomeWeb` | `CarruselHome` |
| `ConfiguracionWeb` | `Configuracion` |

Cambios ya aplicados en base de datos y Prisma:

| Actual | Nuevo |
| --- | --- |
| `rubro_web` | `rubro` |
| `pedido_web` | `pedido` |
| `articulo_web` | `articulo` |
| `pedido_detalle_web` | `pedido_detalle` |
| `imagen_articulo_web` | `imagen_articulo` |
| `slider_home_web` | `carrusel_home` |
| `configuracion_web` | `configuracion` |

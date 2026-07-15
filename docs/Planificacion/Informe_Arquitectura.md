# Informe de Arquitectura — Proyecto Maxes Web

Este documento describe la arquitectura de software, el stack tecnológico, la infraestructura y los flujos de integración para la plataforma web de **Maxes Insumos** dentro del contexto `/home/jnemiro/app_nodejs/maxes/maxes_web`.

---

## 1. Objetivo General

El objetivo de este proyecto es implementar la plataforma web para **Maxes Insumos**, la cual consta de:
* Un catálogo público en línea y sistema de toma de pedidos para los clientes finales.
* Una base de datos independiente y acotada con información exclusivamente web.
* Una API de backend para servir al cliente y permitir la sincronización de datos con el sistema de gestión interno (**Keytron**) existente de la empresa.

---

## 2. Arquitectura General y Stack Tecnológico

La solución se compone de dos proyectos dentro de este repositorio y dos entornos de datos claramente separados: uno local para desarrollo y otro productivo para despliegue. El catálogo público desplegado en Vercel se sirve desde rutas internas de Next en `maxes_web_cli`, que consultan PostgreSQL con Prisma.

1. **`maxes_web` (Servidor / API)**:
   * **Tecnología**: Node.js (Express o NestJS) o Serverless Functions.
   * **ORM**: **Prisma** (para modelado y acceso tipado a la base de datos).
   * **Hosting**: **Vercel** (despliegue del servidor backend/API).
2. **`maxes_web_cli` (Cliente / Frontend)**:
   * **Tecnología**: Next.js + React + TypeScript.
   * **Hosting**: **Vercel** (despliegue del cliente y API routes públicas).
   * **API pública web**: rutas internas `/api/public/*` para rubros, artículos, carruseles, configuración y pedidos.
3. **Base de Datos Web**:
   * **Tecnología**: PostgreSQL.
   * **Desarrollo local**: contenedor Docker `db-maxes-web`.
   * **Producción**: **Supabase** (alojamiento y administración de la base de datos relacional web).

### Flujo de Despliegue (CI/CD)
El control de versiones y el despliegue se manejan mediante **GitHub**:
* Al realizar un *push* a la rama principal en GitHub, Vercel compila y publica automáticamente las actualizaciones del cliente (`maxes_web_cli`).
* Los cambios en la estructura de la base de datos se manejan mediante migraciones de **Prisma**.
* El desarrollo y las pruebas iniciales se realizan sobre `db-maxes-web` en Docker.
* Supabase queda reservado para el entorno de producción y se configura en Vercel mediante `DATABASE_URL`.

```mermaid
graph TD
    subgraph "Infraestructura Local"
        KEYTRON[Sistema de Gestión Interno - Keytron]
        DB_LOCAL[(db-maxes-web - PostgreSQL Docker)]
    end

    subgraph "Infraestructura Cloud (Vercel & Supabase)"
        subgraph "Supabase"
            DB_WEB[(Base de Datos Produccion - PostgreSQL)]
        end
        
        subgraph "Vercel"
            API[maxes_web_cli - API routes publicas Next + Prisma]
            WEB[maxes_web_cli - Cliente Next.js]
        end
    end

    subgraph "Control de Versiones & CI/CD"
        GH[Repositorio GitHub]
    end

    %% Despliegues
    GH ==>|Despliegue Automático| WEB

    %% Flujos de datos
    KEYTRON ==>|1. API Novedades: Publica Catalogo| API
    API <=>|Desarrollo local con Prisma| DB_LOCAL
    API <=>|Produccion con Prisma| DB_WEB
    WEB <=>|/api/public: Consulta Catalogo y Crea Pedido| API
    API ==>|2. API Pedidos: Entrega Pedidos| KEYTRON
    
    style KEYTRON fill:#f9f,stroke:#333,stroke-width:2px
    style WEB fill:#bbf,stroke:#333,stroke-width:2px
    style API fill:#dfd,stroke:#333,stroke-width:2px
    style DB_LOCAL fill:#ffd,stroke:#333,stroke-width:2px
    style DB_WEB fill:#ffd,stroke:#333,stroke-width:2px
    style GH fill:#eee,stroke:#333,stroke-width:1px
```

---

## 3. Base de Datos Web

### 3.1 Estrategia de Entornos

* **Entorno local**:
  * Archivo frontend: `maxes_web_cli/.env.desarrollo`
  * Archivo backend/integración: `maxes_web/.env.desarrollo`
  * Motor: PostgreSQL en Docker
  * Base: `db-maxes-web`
  * `DATABASE_URL`: `postgresql://postgres:postgres@localhost:5432/db-maxes-web?schema=public`
* **Entorno de producción**:
  * Variable de entorno en Vercel para `maxes_web_cli`: `DATABASE_URL`
  * Motor: PostgreSQL en Supabase
  * Usar preferentemente el connection string del pooler de Supabase.

### 3.2 Esquema de Prisma

La base de datos web es independiente de Keytron. El esquema Prisma operativo actual usa tablas físicas con sufijo `_web`.

* **`rubro_web`**: Categorías visibles en la web.
* **`articulo_web`**: Catálogo de productos publicados.
* **`pedido_web`**: Cabecera de los pedidos de clientes.
* **`pedido_detalle_web`**: Detalle de artículos de cada pedido.
* **`articulo_imagen_web`**: Imágenes adicionales por artículo.
* **`carrusel_home_web`**: Banners de la portada.
* **`configuracion_web`**: Parámetros de control de la página.

### 3.3 Configuración de producción

En Vercel, el proyecto `maxes_web_cli` debe tener:

```env
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?schema=public
```

No se usa `NEXT_PUBLIC_API_URL` para el catálogo. Las variables `NEXT_PUBLIC_*` solo corresponden a datos que deben estar disponibles en el navegador.

---

## 4. Interfaces de Integración con Keytron (APIs de Comunicación)

La sincronización entre el sistema local Keytron y la base de datos web se realiza exclusivamente mediante **dos APIs** provistas por `maxes_web`:

### A. API de Novedades (Keytron $\rightarrow$ Web)
* **Propósito**: Publicar artículos nuevos, modificaciones de precios, actualizaciones de stock y rubros del catálogo.
* **Funcionamiento**: Keytron realiza peticiones `POST` o `PUT` hacia `maxes_web` enviando los lotes de novedades. El servidor actualiza la base de datos PostgreSQL correspondiente al entorno activo utilizando Prisma ORM.
* **Endpoint Sugerido**: `POST /api/catalog/sync`

### B. API de Pedidos (Web $\rightarrow$ Keytron)
* **Propósito**: Permitir que el sistema Keytron descargue los pedidos nuevos registrados en la web para procesarlos internamente.
* **Funcionamiento**: Keytron consulta periódicamente los pedidos pendientes en la web y los descarga. Una vez procesados, envía una confirmación para marcar los pedidos como importados.
* **Endpoints Sugeridos**:
  * `GET /api/orders/pending` (Keytron baja los pedidos con estado `nuevo`).
  * `PUT /api/orders/confirm-import` (Keytron confirma la recepción exitosa para cambiar el estado a `importado`).

---

## 5. Próximos Pasos de Implementación

1. **Base local primero**: levantar `db-maxes-web` con Docker y validar Prisma contra esa base.
2. **Ajuste de nomenclatura**: continuar con el renombre de entidades auxiliares para eliminar nombres en inglés y reducir sufijos redundantes.
   * Criterio aplicado en backend: nombre funcional en espanol y sufijo tecnico en ingles, por ejemplo `PedidoController` y `catalogoRoutes`.
3. **Migración de esquema**: generar y aplicar la migración de Prisma para reflejar los nombres definitivos.
4. **Producción**: conectar Supabase una vez estabilizado el esquema local.
5. **Despliegue**: mantener Vercel para frontend y backend según la estrategia final de hosting.

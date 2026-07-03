# Desarrollo Local

## Objetivo

Levantar el proyecto en desarrollo con:

* Base PostgreSQL local en Docker: `db-maxes-web`
* Backend Express + Prisma: `maxes_web`
* Frontend Next.js: `maxes_web_cli`

## Requisitos

* Docker y Docker Compose
* Node.js 20 o superior
* npm

## Estructura de entornos

* Base local: `docker-compose.yml`
* Variables backend base: `maxes_web/.env`
* Variables backend local: `maxes_web/.env.desarrollo`
* Variables backend produccion: `maxes_web/.env.produccion`
* Variables frontend base: `maxes_web_cli/.env`
* Variables frontend local: `maxes_web_cli/.env.desarrollo`
* Variables frontend produccion: `maxes_web_cli/.env.produccion`

## Puertos de desarrollo

* Cliente Next.js: `3785`
* Servidor Express: `4785`

## 1. Levantar la base local

Desde la raiz del repositorio:

```bash
docker compose up -d db-maxes-web
```

Verificar estado:

```bash
docker compose ps
```

La base local expone:

* Host: `localhost`
* Puerto: `5432`
* Base: `db-maxes-web`
* Usuario: `postgres`
* Password: `postgres`

## 2. Backend

Instalar dependencias:

```bash
npm install --prefix maxes_web
```

Generar cliente Prisma:

```bash
npm --prefix maxes_web run prisma:generate
```

Crear y aplicar migracion local:

```bash
cd maxes_web
NODE_ENV=development npx prisma migrate dev --name esquema_inicial
```

Levantar backend:

```bash
npm --prefix maxes_web run dev
```

Si el puerto `4785` ya esta en uso, el script lo libera y vuelve a levantar el servidor.

Backend local:

* URL: `http://localhost:4785`

## 3. Frontend

Instalar dependencias:

```bash
npm install --prefix maxes_web_cli
```

Levantar frontend:

```bash
npm --prefix maxes_web_cli run dev
```

Si el puerto `3785` ya esta en uso, el script lo libera y vuelve a levantar el cliente.

Frontend local:

* URL habitual: `http://localhost:3785`

Si el frontend necesita apuntar a otra URL de backend, definir `NEXT_PUBLIC_API_URL`.

## 4. Detener la base local

```bash
docker compose stop db-maxes-web
```

## 5. Bajar la base local

```bash
docker compose down
```

## 6. Reiniciar desde cero

Si queres borrar tambien los datos persistidos:

```bash
docker compose down -v
```

Luego volver a levantar:

```bash
docker compose up -d db-maxes-web
```

## Notas

* El esquema Prisma actual usa tablas en singular: `rubro`, `articulo`, `pedido`, `pedido_detalle`, `imagen_articulo`, `carrusel_home`, `configuracion`.
* Supabase queda reservado para produccion.
* Primero conviene validar migraciones y datos sobre `db-maxes-web` antes de conectar produccion.
* En desarrollo, `npm run dev` en ambos proyectos intenta cerrar el proceso que ya este escuchando en su puerto antes de iniciar de nuevo.

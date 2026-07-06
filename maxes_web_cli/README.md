# Maxes Web CLI

Frontend público de Maxes Insumos construido con Next.js App Router.

## Flujo de datos

El navegador consulta rutas internas del mismo proyecto:

```text
/api/public/rubros
/api/public/articulos
/api/public/carruseles
/api/public/config
/api/public/pedido
```

Esas rutas usan Prisma y leen PostgreSQL desde `DATABASE_URL`.

## Entornos

### Desarrollo

La base local es el contenedor Docker `db-maxes-web`.

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/db-maxes-web?schema=public
```

### Produccion

En Vercel configurar `DATABASE_URL` con el connection string del pooler de Supabase:

```env
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?schema=public
```

No se usa `NEXT_PUBLIC_API_URL` para el catalogo.

## Comandos

```bash
npm install
npm run dev
npm run build
```

El servidor local escucha normalmente en:

```text
http://localhost:3785
```

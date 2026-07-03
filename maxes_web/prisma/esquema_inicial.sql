-- CreateTable
CREATE TABLE "rubro_web" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100),
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rubro_web_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articulo_web" (
    "id" SERIAL NOT NULL,
    "articulo_origen_id" INTEGER NOT NULL,
    "articulo_cod" VARCHAR(20) NOT NULL,
    "articulo_des" VARCHAR(30),
    "articulo_texto_web" TEXT,
    "articulo_imagen_id" INTEGER,
    "precio_mayorista" DECIMAL(18,2),
    "precio_minorista" DECIMAL(18,2),
    "rubro_id" INTEGER,
    "proveedor_des" VARCHAR(20),
    "stock_web" INTEGER,
    "destacado" CHAR(1) NOT NULL DEFAULT 'N',
    "visible" CHAR(1) NOT NULL DEFAULT 'S',
    "fecha_publicacion" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articulo_web_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_web" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente_nombre" VARCHAR(150) NOT NULL,
    "doc_tipo" VARCHAR(20) NOT NULL,
    "doc_numero" VARCHAR(20) NOT NULL,
    "cuit" VARCHAR(20) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'nuevo',

    CONSTRAINT "pedido_web_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_detalle_web" (
    "id" SERIAL NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "articulo_id" INTEGER,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "pedido_detalle_web_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articulo_imagen_web" (
    "id" SERIAL NOT NULL,
    "articulo_id" INTEGER NOT NULL,
    "imagen_url" VARCHAR(500) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "articulo_imagen_web_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carrusel_home_web" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(150),
    "link_destino" VARCHAR(250),
    "imagen_url" VARCHAR(500) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "carrusel_home_web_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_web" (
    "id" SERIAL NOT NULL,
    "whatsapp_contacto" VARCHAR(50) NOT NULL,
    "direccion_local" VARCHAR(250) NOT NULL,
    "email_notificaciones" VARCHAR(150),
    "mantenimiento" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "configuracion_web_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articulo_web_articulo_cod_key" ON "articulo_web"("articulo_cod");

-- AddForeignKey
ALTER TABLE "articulo_web" ADD CONSTRAINT "articulo_web_rubro_id_fkey" FOREIGN KEY ("rubro_id") REFERENCES "rubro_web"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulo_web" ADD CONSTRAINT "articulo_web_articulo_imagen_id_fkey" FOREIGN KEY ("articulo_imagen_id") REFERENCES "articulo_imagen_web"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle_web" ADD CONSTRAINT "pedido_detalle_web_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedido_web"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_detalle_web" ADD CONSTRAINT "pedido_detalle_web_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "articulo_web"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulo_imagen_web" ADD CONSTRAINT "articulo_imagen_web_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "articulo_web"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed
INSERT INTO "configuracion_web" ("whatsapp_contacto", "direccion_local", "email_notificaciones", "mantenimiento")
VALUES ('+5491128478046', 'Pasteur 70 | Once', NULL, false);

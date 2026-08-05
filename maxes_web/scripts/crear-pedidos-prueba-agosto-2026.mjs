import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARCA = "[PRUEBA ESTADISTICAS AGOSTO 2026]";

const escenarios = [
  { dia: 1, hora: "10:15", nombre: "Ana", apellido: "Prueba", tipoPrecio: "minorista", dispositivo: "mobile", sistema: "Android", navegador: "Chrome", origen: "instagram", medio: "social", cantidades: [1, 2], favoritos: 1, comentarios: [true, false] },
  { dia: 1, hora: "13:40", nombre: "Bruno", apellido: "Demo", tipoPrecio: "mayorista", dispositivo: "desktop", sistema: "Windows", navegador: "Chrome", origen: "google", medio: "organic", cantidades: [3, 2, 1], favoritos: 0, comentarios: [false, false, true] },
  { dia: 1, hora: "18:05", nombre: "Carla", apellido: "Test", tipoPrecio: "minorista", dispositivo: "mobile", sistema: "iOS", navegador: "Safari", origen: null, medio: null, cantidades: [1], favoritos: 0, comentarios: [false] },
  { dia: 2, hora: "09:20", nombre: "Diego", apellido: "Prueba", tipoPrecio: "mayorista", dispositivo: "desktop", sistema: "Linux", navegador: "Firefox", origen: "newsletter", medio: "email", cantidades: [4, 2], favoritos: 1, comentarios: [true, false] },
  { dia: 2, hora: "14:10", nombre: "Elena", apellido: "Demo", tipoPrecio: "minorista", dispositivo: "tablet", sistema: "Android", navegador: "Chrome", origen: "facebook", medio: "social", cantidades: [1, 1, 2], favoritos: 2, comentarios: [false, true, false] },
  { dia: 2, hora: "19:30", nombre: "Facundo", apellido: "Test", tipoPrecio: "minorista", dispositivo: "desktop", sistema: "Windows", navegador: "Edge", origen: "google", medio: "cpc", cantidades: [2, 1], favoritos: 0, comentarios: [false, false] },
  { dia: 3, hora: "08:45", nombre: "Gabriela", apellido: "Prueba", tipoPrecio: "mayorista", dispositivo: "mobile", sistema: "Android", navegador: "Chrome", origen: "whatsapp", medio: "social", cantidades: [5, 3], favoritos: 1, comentarios: [true, true] },
  { dia: 3, hora: "12:25", nombre: "Hernan", apellido: "Demo", tipoPrecio: "minorista", dispositivo: "desktop", sistema: "macOS", navegador: "Safari", origen: null, medio: null, cantidades: [1, 2, 1], favoritos: 0, comentarios: [false, false, false] },
  { dia: 3, hora: "17:50", nombre: "Ines", apellido: "Test", tipoPrecio: "mayorista", dispositivo: "mobile", sistema: "iOS", navegador: "Safari", origen: "instagram", medio: "paid_social", cantidades: [2, 4], favoritos: 2, comentarios: [true, false] },
];

function fecha(dia, hora, minutosExtra = 0) {
  const base = new Date(`2026-08-${String(dia).padStart(2, "0")}T${hora}:00-03:00`);
  return new Date(base.getTime() + minutosExtra * 60_000);
}

async function main() {
  const articulos = await prisma.articulo.findMany({
    where: { stockWeb: { gt: 5 }, visible: "S" },
    orderBy: { id: "asc" },
    take: 12,
  });

  if (articulos.length < 6) {
    throw new Error("No hay suficientes artículos con stock para crear los pedidos de prueba.");
  }

  let creados = 0;
  const pedidos = [];

  for (const [indice, escenario] of escenarios.entries()) {
    const idSesion = `prueba-estadisticas-202608${String(escenario.dia).padStart(2, "0")}-${indice + 1}`;
    const existente = await prisma.carritoAnalytics.findUnique({
      where: { idAnalyticsSession: idSesion },
      select: { pedidoId: true },
    });

    if (existente) {
      pedidos.push(existente.pedidoId);
      continue;
    }

    const seleccion = escenario.cantidades.map((cantidad, posicion) => {
      const articulo = articulos[(indice + posicion * 2) % articulos.length];
      const precio = Number(
        escenario.tipoPrecio === "mayorista"
          ? articulo.precioMayorista
          : articulo.precioMinorista
      );
      return { articulo, cantidad, precio, comentado: escenario.comentarios[posicion] };
    });
    const montoTotal = seleccion.reduce((total, item) => total + item.cantidad * item.precio, 0);
    const inicio = fecha(escenario.dia, escenario.hora);
    const inicioPedido = fecha(escenario.dia, escenario.hora, 7);
    const generado = fecha(escenario.dia, escenario.hora, 12);

    const pedido = await prisma.$transaction(async (tx) => {
      const nuevoPedido = await tx.pedido.create({
        data: {
          fecha: generado,
          cliente_nro: `TEST-${String(indice + 1).padStart(3, "0")}`,
          nombre: escenario.nombre,
          apellido: escenario.apellido,
          doc_tipo: "DNI",
          doc_numero: `990000${String(indice + 1).padStart(2, "0")}`,
          email_pedido: `pedido.prueba${indice + 1}@example.com`,
          celular_pedido: `11000000${String(indice + 1).padStart(2, "0")}`,
          cant_productos: seleccion.length,
          cant_unidades: seleccion.reduce((total, item) => total + item.cantidad, 0),
          tipo_precio: escenario.tipoPrecio,
          monto_total: montoTotal,
          tipo_despacho: indice % 2 === 0 ? "retiro" : "envio",
          localidad: indice % 2 === 0 ? "CABA" : "Buenos Aires",
          observaciones: `${MARCA} Pedido ficticio para visualizar estadísticas.`,
          estado: "nuevo",
          detalles: {
            create: seleccion.map(({ articulo, cantidad, precio, comentado }) => ({
              articulo_id: articulo.id,
              articuloCod: articulo.articuloCod,
              articuloDes: articulo.articuloDes,
              cantidad,
              precio_unitario: precio,
              comentarioCliente: comentado ? "Dato de prueba" : null,
            })),
          },
        },
      });

      const carrito = await tx.carritoAnalytics.create({
        data: {
          idAnalyticsSession: idSesion,
          estado: "pedido_generado",
          etapa: "pedido_generado",
          fueAbandonado: indice === 6,
          cantidadReactivaciones: indice === 6 ? 1 : 0,
          tipoPrecio: escenario.tipoPrecio,
          tipoDispositivo: escenario.dispositivo,
          sistemaOperativo: escenario.sistema,
          navegador: escenario.navegador,
          cantidadProductos: seleccion.length,
          cantidadUnidades: seleccion.reduce((total, item) => total + item.cantidad, 0),
          cantidadFavoritos: escenario.favoritos,
          montoEstimado: montoTotal,
          fechaHoraCreacion: inicio,
          fechaHoraInicioCatalogo: inicio,
          fechaHoraUltimaActividad: generado,
          fechaHoraInicioPedido: inicioPedido,
          fechaHoraUltimaReactivacion: indice === 6 ? inicioPedido : null,
          fechaHoraPedidoGenerado: generado,
          segundosNavegacionActiva: 300 + indice * 45,
          pedidoId: nuevoPedido.id,
          origenCampania: escenario.origen,
          medioCampania: escenario.medio,
          nombreCampania: escenario.medio?.includes("paid") || escenario.medio === "cpc" ? "Promo agosto" : null,
          paginaIngreso: "/catalogo",
          sitioOrigen: escenario.origen ? `https://${escenario.origen}.example` : null,
          detalles: {
            create: seleccion.map(({ articulo, cantidad, precio, comentado }, posicion) => ({
              idIncorporacion: `${idSesion}-item-${posicion + 1}`,
              articuloId: articulo.id,
              cantidadInicial: cantidad,
              cantidadUltima: cantidad,
              precioUnitario: precio,
              tuvoComentario: comentado,
              origenIncorporacion: posicion < escenario.favoritos ? "panel_favoritos" : "catalogo",
              eraFavoritoAlAgregar: posicion < escenario.favoritos,
              fechaHoraAgregado: fecha(escenario.dia, escenario.hora, 2 + posicion),
              fechaHoraUltimaModificacion: inicioPedido,
            })),
          },
        },
      });

      for (let favorito = 0; favorito < escenario.favoritos; favorito += 1) {
        await tx.favoritoAnalyticsEvento.create({
          data: {
            carritoAnalyticsId: carrito.id,
            articuloId: seleccion[favorito % seleccion.length].articulo.id,
            accion: "agregado",
            origen: "catalogo",
            cantidadFavoritos: favorito + 1,
            fechaHora: fecha(escenario.dia, escenario.hora, 3 + favorito),
          },
        });
      }

      return nuevoPedido;
    });

    creados += 1;
    pedidos.push(pedido.id);
  }

  console.log(JSON.stringify({ creados, existentes: escenarios.length - creados, pedidos }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

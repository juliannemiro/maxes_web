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

async function guardarMedicionSesion(db, input) {
  await db.$executeRawUnsafe(
    `UPDATE analytics_carrito
     SET segundos_navegacion_activa = $2,
         segundos_activos_catalogo = $3,
         segundos_activos_pedido = $4
     WHERE id = $1`,
    input.carritoId, input.total, input.catalogo, input.pedido
  );
  await db.$executeRawUnsafe(
    `INSERT INTO analytics_sesion (
       id_analytics_session, id_analytics_visitor, carrito_analytics_id,
       fecha_hora_inicio, fecha_hora_ultima_actividad, segundos_navegacion_activa,
       segundos_activos_catalogo, segundos_activos_pedido, etapa, pedido_generado,
       tipo_dispositivo, sistema_operativo, navegador, origen_campania,
       medio_campania, pagina_ingreso, sitio_origen
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (id_analytics_session) DO UPDATE SET
       segundos_navegacion_activa = EXCLUDED.segundos_navegacion_activa,
       segundos_activos_catalogo = EXCLUDED.segundos_activos_catalogo,
       segundos_activos_pedido = EXCLUDED.segundos_activos_pedido,
       etapa = EXCLUDED.etapa,
       pedido_generado = EXCLUDED.pedido_generado`,
    input.sesionId, input.visitanteId, input.carritoId, input.inicio, input.ultimaActividad,
    input.total, input.catalogo, input.pedido, input.etapa, input.pedidoGenerado,
    input.dispositivo, input.sistema, input.navegador, input.origen, input.medio,
    "/", input.origen ? `https://${input.origen}.example` : null
  );
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
    const segundosCatalogo = 210 + indice * 35;
    const segundosPedido = 75 + indice * 12;
    const segundosActivos = segundosCatalogo + segundosPedido;
    const existente = await prisma.carritoAnalytics.findUnique({
      where: { idAnalyticsSession: idSesion },
      select: { id: true, pedidoId: true },
    });

    if (existente) {
      await guardarMedicionSesion(prisma, {
        carritoId: existente.id, sesionId: idSesion, visitanteId: `visitante-prueba-${indice + 1}`,
        inicio: fecha(escenario.dia, escenario.hora), ultimaActividad: fecha(escenario.dia, escenario.hora, 12),
        total: segundosActivos, catalogo: segundosCatalogo, pedido: segundosPedido,
        etapa: "pedido_generado", pedidoGenerado: true, dispositivo: escenario.dispositivo,
        sistema: escenario.sistema, navegador: escenario.navegador, origen: escenario.origen, medio: escenario.medio,
      });
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
          segundosNavegacionActiva: segundosActivos,
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
    const carritoCreado = await prisma.carritoAnalytics.findUnique({ where: { idAnalyticsSession: idSesion } });
    await guardarMedicionSesion(prisma, {
      carritoId: carritoCreado.id, sesionId: idSesion, visitanteId: `visitante-prueba-${indice + 1}`,
      inicio, ultimaActividad: generado, total: segundosActivos, catalogo: segundosCatalogo,
      pedido: segundosPedido, etapa: "pedido_generado", pedidoGenerado: true,
      dispositivo: escenario.dispositivo, sistema: escenario.sistema, navegador: escenario.navegador,
      origen: escenario.origen, medio: escenario.medio,
    });
  }

  const incompletos = [
    { n: 1, dia: 4, dispositivo: "mobile", sistema: "Android", navegador: "Chrome", origen: "instagram", medio: "social", catalogo: 420, pedido: null, estado: "abandonado" },
    { n: 2, dia: 4, dispositivo: "desktop", sistema: "Windows", navegador: "Edge", origen: "google", medio: "organic", catalogo: 610, pedido: 95, estado: "abandonado" },
    { n: 3, dia: 5, dispositivo: "mobile", sistema: "iOS", navegador: "Safari", origen: null, medio: null, catalogo: 265, pedido: null, estado: "abandonado" },
    { n: 4, dia: 5, dispositivo: "tablet", sistema: "Android", navegador: "Chrome", origen: "facebook", medio: "social", catalogo: 350, pedido: 130, estado: "abandonado" },
    { n: 5, dia: 5, dispositivo: "desktop", sistema: "Linux", navegador: "Firefox", origen: "newsletter", medio: "email", catalogo: 190, pedido: null, estado: "activo" },
    { n: 6, dia: 6, dispositivo: "mobile", sistema: "Android", navegador: "Chrome", origen: "google", medio: "cpc", catalogo: 300, pedido: 80, estado: "activo" },
  ];

  for (const caso of incompletos) {
    const idCarrito = `prueba-incompleta-carrito-${caso.n}`;
    const idSesion = `prueba-incompleta-sesion-${caso.n}`;
    const inicio = fecha(caso.dia, "11:00");
    const ultimaActividad = fecha(caso.dia, "11:00", 20);
    const segundosActivos = caso.catalogo + (caso.pedido ?? 0);
    const articulo = articulos[caso.n % articulos.length];
    const precio = Number(articulo.precioMinorista);
    const carrito = await prisma.carritoAnalytics.upsert({
      where: { idAnalyticsSession: idCarrito },
      update: {
        estado: caso.estado,
        etapa: caso.pedido == null ? "carrito" : "formulario_pedido",
        fueAbandonado: caso.estado === "abandonado",
        segundosNavegacionActiva: segundosActivos,
      },
      create: {
        idAnalyticsSession: idCarrito,
        estado: caso.estado,
        etapa: caso.pedido == null ? "carrito" : "formulario_pedido",
        fueAbandonado: caso.estado === "abandonado",
        tipoPrecio: "minorista",
        tipoDispositivo: caso.dispositivo,
        sistemaOperativo: caso.sistema,
        navegador: caso.navegador,
        cantidadProductos: 1,
        cantidadUnidades: caso.n + 1,
        montoEstimado: precio * (caso.n + 1),
        fechaHoraCreacion: inicio,
        fechaHoraInicioCatalogo: inicio,
        fechaHoraUltimaActividad: ultimaActividad,
        fechaHoraInicioPedido: caso.pedido == null ? null : fecha(caso.dia, "11:00", 12),
        fechaHoraMarcadoAbandonado: caso.estado === "abandonado" ? fecha(caso.dia, "14:00") : null,
        segundosNavegacionActiva: segundosActivos,
        origenCampania: caso.origen,
        medioCampania: caso.medio,
        paginaIngreso: "/",
        sitioOrigen: caso.origen ? `https://${caso.origen}.example` : null,
        detalles: { create: [{
          idIncorporacion: `${idCarrito}-item-1`,
          articuloId: articulo.id,
          cantidadInicial: caso.n + 1,
          cantidadUltima: caso.n + 1,
          precioUnitario: precio,
          tuvoComentario: caso.n % 2 === 0,
          origenIncorporacion: caso.n % 2 === 0 ? "panel_favoritos" : "catalogo",
          eraFavoritoAlAgregar: caso.n % 2 === 0,
          fechaHoraAgregado: fecha(caso.dia, "11:00", 2),
          fechaHoraUltimaModificacion: ultimaActividad,
        }] },
      },
    });
    await guardarMedicionSesion(prisma, {
      carritoId: carrito.id, sesionId: idSesion, visitanteId: `visitante-incompleto-${caso.n}`,
      inicio, ultimaActividad, total: segundosActivos, catalogo: caso.catalogo, pedido: caso.pedido,
      etapa: caso.pedido == null ? "catalogo" : "formulario_pedido", pedidoGenerado: false,
      dispositivo: caso.dispositivo, sistema: caso.sistema, navegador: caso.navegador,
      origen: caso.origen, medio: caso.medio,
    });
  }

  for (let indice = 0; indice < 8; indice += 1) {
    const escenario = escenarios[indice % escenarios.length];
    const idCarrito = `prueba-estadisticas-202608${String(escenario.dia).padStart(2, "0")}-${(indice % escenarios.length) + 1}`;
    const carrito = await prisma.carritoAnalytics.findUnique({ where: { idAnalyticsSession: idCarrito } });
    const articulo = articulos[indice % 4];
    if (!carrito) continue;
    await prisma.$executeRawUnsafe(
      `INSERT INTO analytics_articulo_compartido
         (carrito_analytics_id, articulo_id, metodo, fecha_hora, id_analytics_session, id_evento)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id_evento) DO NOTHING`,
      carrito.id,
      articulo.id,
      indice % 3 === 0 ? "copiar_link" : "whatsapp",
      fecha(escenario.dia, escenario.hora, 4),
      idCarrito,
      `evento-compartido-prueba-${indice + 1}`
    );
  }

  console.log(JSON.stringify({
    creados,
    actualizados: escenarios.length - creados,
    pedidos,
    sesionesIncompletas: incompletos.length,
    compartidosDePrueba: 8,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

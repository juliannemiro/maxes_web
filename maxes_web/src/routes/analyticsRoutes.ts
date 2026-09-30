import { Router } from "express";
import prisma from "../config/prisma";
import { authKeytron } from "../middlewares/authKeytron";

const router = Router();

router.use(authKeytron);

router.get("/", async (_req, res, next) => {
  try {
    const abandonados = await prisma.$queryRawUnsafe<Array<{ cantidad: number | bigint }>>(
      "SELECT analytics_marcar_carritos_abandonados() AS cantidad"
    );
    const [carritos, detalles, sesiones, favoritos, compartidos] = await Promise.all([
      prisma.$queryRawUnsafe("SELECT * FROM analytics_carrito ORDER BY id"),
      prisma.$queryRawUnsafe(
        "SELECT * FROM analytics_carrito_detalle ORDER BY carrito_analytics_id, id"
      ),
      prisma.$queryRawUnsafe("SELECT * FROM analytics_sesion ORDER BY id"),
      prisma.$queryRawUnsafe(
        "SELECT * FROM analytics_favorito_evento ORDER BY carrito_analytics_id, id"
      ),
      prisma.$queryRawUnsafe(
        "SELECT * FROM analytics_articulo_compartido ORDER BY carrito_analytics_id, id"
      )
    ]);

    res.json({
      carritosAbandonadosMarcados: Number(abandonados[0]?.cantidad ?? 0),
      carritos,
      detalles,
      sesiones,
      favoritos,
      compartidos
    });
  } catch (error) {
    next(error);
  }
});

export default router;

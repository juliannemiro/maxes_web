import { Router } from "express";
import prisma from "../config/prisma";
import { authKeytron } from "../middlewares/authKeytron";

const router = Router();
router.use(authKeytron);

const slug = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

router.get("/", async (_req, res, next) => {
  try {
    const articulos = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT a.id, a.articulo_origen_id, a.articulo_cod, a.articulo_des,
             a.articulo_texto_web, c.codigo AS categoria_codigo, c.nombre AS categoria_nombre
      FROM articulo_web a
      LEFT JOIN categoria_web c ON c.categoria_origen_id=a.categoria_id
      WHERE a.visible='S'
      ORDER BY a.id
    `);
    res.json({
      generadoEn: new Date().toISOString(),
      paginas: articulos.map((articulo) => ({
        tipo: "articulo",
        id: Number(articulo.id),
        origenId: Number(articulo.articulo_origen_id),
        ruta: `/articulos/${slug(articulo.articulo_cod)}`,
        titulo: String(articulo.articulo_des || articulo.articulo_cod),
        descripcion: String(articulo.articulo_texto_web || articulo.articulo_des || "").slice(0, 160),
        categoria: articulo.categoria_nombre || articulo.categoria_codigo || null
      }))
    });
  } catch (error) { next(error); }
});

export default router;

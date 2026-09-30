import { Router } from "express";
import pedidoRoutes from "./pedidoRoutes";
import analyticsRoutes from "./analyticsRoutes";
import seoRoutes from "./seoRoutes";
import publicRoutes from "./publicRoutes";

const routes = Router();

routes.use("/api/integracion/pedidos", pedidoRoutes);
routes.use("/api/integracion/analytics", analyticsRoutes);
routes.use("/api/integracion/seo", seoRoutes);

// Mount public catalog routes (used by Web Frontend maxes_web_cli)
routes.use("/api/public", publicRoutes);

export default routes;

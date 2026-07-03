import { Router } from "express";
import catalogoRoutes from "./catalogoRoutes";
import pedidoRoutes from "./pedidoRoutes";
import publicRoutes from "./publicRoutes";

const routes = Router();

// Mount integration/sync routes (used by Keytron ERP)
routes.use("/api/catalog", catalogoRoutes);
routes.use("/api/orders", pedidoRoutes);

// Mount public catalog routes (used by Web Frontend maxes_web_cli)
routes.use("/api/public", publicRoutes);

export default routes;

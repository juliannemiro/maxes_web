import { Router } from "express";
import { authKeytron } from "../middlewares/authKeytron";
import { PedidoController } from "../controllers/PedidoController";

const router = Router();

// Apply Keytron auth middleware to all order integration endpoints
router.use(authKeytron);

// Fetch all pending orders for Keytron
router.get("/pending", PedidoController.getPendingOrders);

// Confirm import of orders
router.post("/confirm-import", PedidoController.confirmImport);

// Update specific order status
router.put("/:id/status", PedidoController.updateStatus);

export default router;

import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { desempenoController } from "../controllers/desempeno.controller.js";

const router = express.Router();

// GET /api/desempenos
router.get("/", protect, desempenoController.list);

export default router;
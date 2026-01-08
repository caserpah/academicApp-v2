import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { gradoController } from "../controllers/grado.controller.js";

const router = express.Router();

// GET /api/grados
router.get("/", protect, gradoController.list);

export default router;
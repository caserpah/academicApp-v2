import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { dimensionController } from "../controllers/dimension.controller.js";

const router = express.Router();

// GET /api/dimensiones
router.get("/", protect, dimensionController.list);

export default router;
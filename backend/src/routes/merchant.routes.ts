import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireAuth, requireRole } from "@/middleware/auth";
import { getOverview, getRecentActivity, listOrders } from "@/controllers/merchant.controller";

export const merchantRouter = Router();

// Store-wide revenue and the full agent audit trail are merchant-only.
merchantRouter.use(asyncHandler(requireAuth), requireRole("MERCHANT"));

merchantRouter.get("/overview", asyncHandler(getOverview));
merchantRouter.get("/activity", asyncHandler(getRecentActivity));
merchantRouter.get("/orders", asyncHandler(listOrders));

import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { getOverview, getRecentActivity, listOrders } from "@/controllers/merchant.controller";

export const merchantRouter = Router();

merchantRouter.get("/overview", asyncHandler(getOverview));
merchantRouter.get("/activity", asyncHandler(getRecentActivity));
merchantRouter.get("/orders", asyncHandler(listOrders));
